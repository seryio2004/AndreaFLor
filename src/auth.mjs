import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const params = { N: 16384, r: 8, p: 1, keylen: 64 };
export const minPasswordLength = 12;

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < minPasswordLength) throw new Error(`La contraseña debe tener al menos ${minPasswordLength} caracteres.`);
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p });
  return ['scrypt', params.N, params.r, params.p, salt.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [kind, N, r, p, salt, hash] = String(stored).split('$');
  if (kind !== 'scrypt' || typeof password !== 'string') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return timingSafeEqual(expected, actual);
}

// Se verifica contra este hash cuando el usuario no existe para que el tiempo de respuesta no revele qué usuarios existen.
const dummyHash = await hashPassword(randomBytes(18).toString('base64'));

const sha256 = value => createHash('sha256').update(value).digest('hex');

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function authStore(db, { idleMs, absoluteMs, now = () => Date.now() }) {
  const q = {
    user: db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?'),
    userById: db.prepare('SELECT id, username FROM users WHERE id = ?'),
    upsertUser: db.prepare(`INSERT INTO users (username, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at`),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)'),
    session: db.prepare('SELECT s.token_hash, s.user_id, s.csrf_token, s.last_seen_at, s.expires_at, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?'),
    touch: db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    deleteUserSessions: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    purge: db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen_at <= ?'),
  };

  return {
    /** Crea o actualiza la cuenta y revoca sus sesiones abiertas. No existe alta pública. */
    async setOwner(username, password) {
      if (!/^[\w.@-]{3,60}$/.test(username ?? '')) throw new Error('El usuario debe tener entre 3 y 60 letras, números o los signos . _ - @');
      const hash = await hashPassword(password);
      const at = new Date(now()).toISOString();
      q.upsertUser.run(username, hash, at, at);
      q.deleteUserSessions.run(q.user.get(username).id);
    },
    async login(username, password) {
      const user = typeof username === 'string' && username.length <= 60 ? q.user.get(username) : undefined;
      const ok = await verifyPassword(password, user?.password_hash ?? dummyHash);
      if (!user || !ok) return null;
      const token = randomBytes(32).toString('base64url');
      const csrfToken = randomBytes(32).toString('base64url');
      const t = now();
      q.purge.run(t, t - idleMs);
      q.insertSession.run(sha256(token), user.id, csrfToken, t, t, t + absoluteMs);
      return { token, csrfToken, username: user.username };
    },
    /** Devuelve la sesión si sigue vigente (inactividad y caducidad absoluta) y renueva la marca de actividad. */
    session(token) {
      if (!token) return null;
      const key = sha256(token);
      const row = q.session.get(key);
      if (!row) return null;
      const t = now();
      if (row.expires_at <= t || row.last_seen_at + idleMs <= t) {
        q.deleteSession.run(key);
        return null;
      }
      q.touch.run(t, key);
      return { username: row.username, userId: row.user_id, csrfToken: row.csrf_token, tokenHash: key };
    },
    logout(token) {
      if (token) q.deleteSession.run(sha256(token));
    },
  };
}

/** Limitador de ventana fija en memoria. Suficiente para una única instancia; se reinicia al reiniciar el proceso. */
export function rateLimiter({ max, windowMs, now = () => Date.now() }) {
  const hits = new Map();
  const entry = key => {
    const t = now();
    let item = hits.get(key);
    if (!item || item.resetAt <= t) {
      item = { count: 0, resetAt: t + windowMs };
      hits.set(key, item);
    }
    if (hits.size > 10_000) for (const [k, v] of hits) if (v.resetAt <= t) hits.delete(k);
    return item;
  };
  return {
    blocked: key => entry(key).count >= max,
    hit: key => { const item = entry(key); item.count += 1; return item.count > max; },
    reset: key => hits.delete(key),
    retryAfter: key => Math.max(1, Math.ceil((entry(key).resetAt - now()) / 1000)),
  };
}
