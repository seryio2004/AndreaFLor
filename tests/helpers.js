import { createServer } from 'node:http';
import { openDatabase } from '../src/db.mjs';
import { createApp } from '../src/app.mjs';
import { loadConfig } from '../src/config.mjs';
import { authStore } from '../src/auth.mjs';

export const owner = { username: 'propietaria', password: 'contraseña-de-prueba-123' };

/** Arranca la aplicación en un puerto libre con una base de datos propia y un reloj controlable. */
export async function startApp({ databasePath = ':memory:', env = {}, clock = { t: Date.now() } } = {}) {
  const config = loadConfig({ NODE_ENV: 'test', ...env });
  const db = openDatabase(databasePath);
  const now = () => clock.t;
  await authStore(db, { idleMs: config.sessionIdleMs, absoluteMs: config.sessionAbsoluteMs, now }).setOwner(owner.username, owner.password);
  const server = createServer(createApp({ db, config, now }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base, db, clock, config,
    async close() { await new Promise(resolve => server.close(resolve)); db.close(); },
  };
}

/** Cliente HTTP mínimo que conserva la cookie de sesión, como haría un navegador. */
export function client(base) {
  let cookie = '';
  let csrf = '';
  async function request(path, { method = 'GET', body, headers = {}, csrf: sendCsrf = true } = {}) {
    const res = await fetch(base + path, {
      method, redirect: 'manual',
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(sendCsrf && csrf ? { 'X-CSRF-Token': csrf } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0].endsWith('=') ? '' : setCookie.split(';')[0];
    const type = res.headers.get('content-type') ?? '';
    const data = type.includes('json') ? await res.json() : await res.text();
    return { status: res.status, data, headers: res.headers };
  }
  return {
    request,
    get cookie() { return cookie; },
    set cookie(value) { cookie = value; },
    async login(username = owner.username, password = owner.password) {
      const res = await request('/api/session', { method: 'POST', body: { username, password } });
      if (res.status === 200) csrf = res.data.csrfToken;
      return res;
    },
  };
}

export const validLead = { business: 'Floristería Ficticia', contact: 'Persona Prueba', town: 'Vigo', area: 'Vigo', phone: '+34 600 000 000', email: 'prueba@example.com', status: 'nuevo', followUp: '', nextAction: '', notes: '' };
export const validRequest = { business: 'Flores de Prueba', town: 'Ourense', area: 'Ourense', email: 'solicitud@example.com', phone: '', message: 'Mensaje de prueba', requestKey: 'clave-de-prueba-0001', website: '' };
