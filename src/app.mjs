import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { authStore, rateLimiter, safeEqual } from './auth.mjs';
import { leadsRepo } from './leads-repo.mjs';
import { validateLead, validateRequest, ValidationError } from '../public/shared/validation.js';

const publicRoot = path.resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2' };
const maxBody = 16 * 1024;
const privatePrefixes = ['/admin/', '/api/', '/acceso/'];

class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

function sendJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(payload), ...headers });
  res.end(payload);
}

async function readJson(req) {
  if (!/^application\/json\b/i.test(req.headers['content-type'] ?? '')) throw new HttpError(415, 'El cuerpo debe enviarse como JSON.');
  if (Number(req.headers['content-length'] ?? 0) > maxBody) throw new HttpError(413, 'La petición es demasiado grande.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBody) throw new HttpError(413, 'La petición es demasiado grande.');
    chunks.push(chunk);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new HttpError(400, 'El cuerpo de la petición no es JSON válido.');
  }
}

function cookies(req) {
  const result = {};
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    try { result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim()); } catch { /* cookie mal formada: se ignora */ }
  }
  return result;
}

export function createApp({ db, config, now = () => Date.now() }) {
  const auth = authStore(db, { idleMs: config.sessionIdleMs, absoluteMs: config.sessionAbsoluteMs, now });
  const leads = leadsRepo(db, () => new Date(now()));
  const cookieName = config.secureCookies ? '__Host-flores_sid' : 'flores_sid';
  const loginByIp = rateLimiter({ max: 10, windowMs: 15 * 60_000, now });
  const loginByUser = rateLimiter({ max: 5, windowMs: 15 * 60_000, now });
  const requestsByIp = rateLimiter({ max: 5, windowMs: 10 * 60_000, now });

  const clientIp = req => {
    if (config.trustProxy) {
      const forwarded = String(req.headers['x-forwarded-for'] ?? '').split(',').map(s => s.trim()).filter(Boolean);
      if (forwarded.length) return forwarded.at(-1);
    }
    return req.socket.remoteAddress ?? 'desconocida';
  };

  const sessionCookie = (value, maxAgeSeconds) => [`${cookieName}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${maxAgeSeconds}`, ...(config.secureCookies ? ['Secure'] : [])].join('; ');
  // Modo local sin contraseña: una sesión fija para este proceso. El CSRF y el control de origen siguen activos.
  const localSession = config.localNoAuth ? { username: 'vista local', userId: 0, csrfToken: randomBytes(32).toString('base64url'), local: true } : null;
  const currentSession = req => localSession ?? auth.session(cookies(req)[cookieName]);

  /** Las peticiones que modifican datos solo se aceptan desde el mismo origen. */
  function assertSameOrigin(req) {
    const origin = req.headers.origin;
    const site = req.headers['sec-fetch-site'];
    if (site && !['same-origin', 'none'].includes(site)) throw new HttpError(403, 'Origen de la petición no permitido.');
    if (origin) {
      const host = req.headers['x-forwarded-host'] && config.trustProxy ? req.headers['x-forwarded-host'] : req.headers.host;
      let originHost;
      try { originHost = new URL(origin).host; } catch { originHost = null; }
      if (originHost !== host) throw new HttpError(403, 'Origen de la petición no permitido.');
    }
  }

  function requireSession(req, { mutating = false } = {}) {
    const session = currentSession(req);
    if (!session) throw new HttpError(401, 'Sesión no iniciada o caducada.');
    if (mutating) {
      assertSameOrigin(req);
      if (!safeEqual(req.headers['x-csrf-token'] ?? '', session.csrfToken)) throw new HttpError(403, 'Token de seguridad no válido. Recarga la página.');
    }
    return session;
  }

  async function api(req, res, pathname) {
    const method = req.method;

    if (pathname === '/api/public/form' && method === 'GET') return sendJson(res, 200, { mode: config.publicForm });

    if (pathname === '/api/public/requests' && method === 'POST') {
      if (config.publicForm === 'off') throw new HttpError(503, 'El formulario no está disponible. Utiliza el teléfono o el correo de contacto.');
      assertSameOrigin(req);
      const ip = clientIp(req);
      if (requestsByIp.hit(ip)) throw new HttpError(429, 'Se han enviado demasiadas solicitudes. Inténtalo de nuevo más tarde.', { retryAfter: requestsByIp.retryAfter(ip) });
      const body = await readJson(req);
      // Campo trampa: invisible para personas; los programas automáticos suelen rellenarlo.
      if (body.website) throw new HttpError(400, 'No se ha podido procesar la solicitud.');
      const requestKey = typeof body.requestKey === 'string' && /^[\w-]{16,64}$/.test(body.requestKey) ? body.requestKey : null;
      if (!requestKey) throw new HttpError(400, 'Recarga la página e inténtalo de nuevo.');
      const data = validateRequest(body);
      const { created } = leads.createFromWeb(data, requestKey);
      return sendJson(res, created ? 201 : 200, { ok: true });
    }

    if (pathname === '/api/session') {
      if (method === 'GET') {
        const session = requireSession(req);
        return sendJson(res, 200, { username: session.username, csrfToken: session.csrfToken, local: Boolean(session.local) });
      }
      if (method === 'POST') {
        assertSameOrigin(req);
        const ip = clientIp(req);
        const body = await readJson(req);
        const user = String(body.username ?? '').toLowerCase().slice(0, 60);
        if (loginByIp.blocked(ip) || loginByUser.blocked(user)) {
          throw new HttpError(429, 'Demasiados intentos fallidos. Espera unos minutos antes de volver a intentarlo.', { retryAfter: Math.max(loginByIp.retryAfter(ip), loginByUser.retryAfter(user)) });
        }
        const result = await auth.login(body.username, body.password);
        if (!result) {
          loginByIp.hit(ip);
          loginByUser.hit(user);
          throw new HttpError(401, 'Usuario o contraseña incorrectos.');
        }
        loginByUser.reset(user);
        return sendJson(res, 200, { username: result.username, csrfToken: result.csrfToken }, { 'Set-Cookie': sessionCookie(encodeURIComponent(result.token), Math.floor(config.sessionAbsoluteMs / 1000)) });
      }
      if (method === 'DELETE') {
        requireSession(req, { mutating: true });
        auth.logout(cookies(req)[cookieName]);
        return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
      }
    }

    if (pathname === '/api/leads') {
      if (method === 'GET') { requireSession(req); return sendJson(res, 200, { leads: leads.list() }); }
      if (method === 'POST') {
        requireSession(req, { mutating: true });
        const lead = leads.createManual(validateLead(await readJson(req)));
        return sendJson(res, 201, { lead });
      }
    }

    const match = pathname.match(/^\/api\/leads\/([0-9a-f-]{36})$/);
    if (match) {
      const id = match[1];
      if (method === 'GET') {
        requireSession(req);
        const lead = leads.get(id);
        if (!lead) throw new HttpError(404, 'El contacto no existe.');
        return sendJson(res, 200, { lead });
      }
      if (method === 'PUT') {
        requireSession(req, { mutating: true });
        const body = await readJson(req);
        const current = leads.get(id);
        if (!current) throw new HttpError(404, 'El contacto no existe o ya se ha eliminado.');
        if (body.updatedAt && body.updatedAt !== current.updatedAt) throw new HttpError(409, 'El contacto ha cambiado desde que lo abriste. Recarga la lista antes de guardar.');
        return sendJson(res, 200, { lead: leads.update(id, validateLead(body)) });
      }
      if (method === 'DELETE') {
        requireSession(req, { mutating: true });
        if (!leads.remove(id)) throw new HttpError(404, 'El contacto no existe o ya se ha eliminado.');
        return sendJson(res, 200, { ok: true });
      }
    }

    throw new HttpError(pathname.startsWith('/api/') ? 404 : 405, 'Ruta de API no encontrada.');
  }

  async function serveStatic(req, res, pathname) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Método no permitido');
    }
    // Las páginas del panel solo se entregan con sesión válida; sin ella se redirige al acceso.
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      if (!currentSession(req)) { res.writeHead(303, { Location: '/acceso/', 'Cache-Control': 'no-store' }); return res.end(); }
    }
    if (pathname === '/acceso/' && currentSession(req)) { res.writeHead(303, { Location: '/admin/', 'Cache-Control': 'no-store' }); return res.end(); }

    const file = path.resolve(publicRoot, `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`);
    if (!file.startsWith(publicRoot + path.sep)) { res.writeHead(403); return res.end('Acceso denegado'); }
    try {
      const info = await stat(file);
      if (info.isDirectory()) { res.writeHead(301, { Location: `${pathname}/` }); return res.end(); }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Página no encontrada');
    }
  }

  return async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
    if (config.secureCookies) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400); return res.end('Petición no válida');
    }
    if (privatePrefixes.some(prefix => pathname.startsWith(prefix)) || pathname === '/admin') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    try {
      if (pathname.startsWith('/api/')) return await api(req, res, pathname);
      return await serveStatic(req, res, pathname);
    } catch (error) {
      if (error instanceof ValidationError) return sendJson(res, 422, { error: error.message, field: error.field });
      if (error instanceof HttpError) {
        const headers = error.extra.retryAfter ? { 'Retry-After': String(error.extra.retryAfter) } : {};
        return sendJson(res, error.status, { error: error.message }, headers);
      }
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Error interno del servidor. Comprueba si el cambio se ha aplicado antes de repetirlo.' });
      else res.destroy();
    }
  };
}
