import test from 'node:test';
import assert from 'node:assert/strict';
import { startApp, client, owner, validLead } from './helpers.js';

test('una sesión anónima no puede consultar ni modificar contactos', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const anon = client(app.base);
  assert.equal((await anon.request('/api/leads')).status, 401);
  assert.equal((await anon.request('/api/leads', { method: 'POST', body: validLead })).status, 401);
  assert.equal((await anon.request('/api/leads/00000000-0000-4000-8000-000000000000', { method: 'PUT', body: validLead })).status, 401);
  assert.equal((await anon.request('/api/leads/00000000-0000-4000-8000-000000000000', { method: 'DELETE' })).status, 401);
  assert.equal((await anon.request('/api/session')).status, 401);
});

test('las páginas del panel redirigen al acceso sin sesión', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const anon = client(app.base);
  for (const path of ['/admin/', '/admin', '/admin/app.js', '/admin/index.html']) {
    const res = await anon.request(path);
    assert.equal(res.status, 303, path);
    assert.equal(res.headers.get('location'), '/acceso/');
    assert.match(res.headers.get('x-robots-tag'), /noindex/);
  }
  assert.equal((await anon.request('/acceso/')).status, 200);
});

test('inicio de sesión, cookie protegida y acceso al panel', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  assert.equal((await c.login(owner.username, 'incorrecta-123456')).status, 401);
  const res = await c.login();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('set-cookie'), /HttpOnly/);
  assert.match(res.headers.get('set-cookie'), /SameSite=Strict/);
  assert.equal((await c.request('/admin/')).status, 200);
  assert.equal((await c.request('/acceso/')).status, 303);
  assert.equal((await c.request('/api/leads')).status, 200);
});

test('las escrituras exigen token CSRF y mismo origen', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead, csrf: false })).status, 403);
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead, headers: { 'X-CSRF-Token': 'falso' } })).status, 403);
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead, headers: { Origin: 'https://otro.example' } })).status, 403);
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead, headers: { Origin: app.base } })).status, 201);
});

test('cerrar sesión revoca el acceso aunque se conserve la cookie', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  const stolen = c.cookie;
  assert.equal((await c.request('/api/session', { method: 'DELETE' })).status, 200);
  c.cookie = stolen;
  assert.equal((await c.request('/api/leads')).status, 401);
  assert.equal((await c.request('/admin/')).status, 303);
});

test('la sesión caduca por inactividad y por duración máxima', async t => {
  const clock = { t: Date.UTC(2026, 10, 14, 9) };
  const app = await startApp({ clock, env: { SESSION_IDLE_HOURS: '2', SESSION_ABSOLUTE_HOURS: '12' } });
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  clock.t += 2 * 3_600_000 + 1;
  assert.equal((await c.request('/api/leads')).status, 401, 'inactividad');

  await c.login();
  for (let i = 0; i < 7; i += 1) { clock.t += 3_600_000 * 1.9; await c.request('/api/leads'); }
  assert.equal((await c.request('/api/leads')).status, 401, 'duración máxima');
});

test('bloquea intentos repetidos de acceso', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  for (let i = 0; i < 5; i += 1) assert.equal((await c.login(owner.username, `mala-${i}-xxxxxxxx`)).status, 401);
  const blocked = await c.login();
  assert.equal(blocked.status, 429, 'incluso la contraseña correcta queda bloqueada temporalmente');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  app.clock.t += 15 * 60_000 + 1;
  assert.equal((await c.login()).status, 200);
});

test('no hay registro público de usuarios', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  assert.equal((await c.request('/api/users', { method: 'POST', body: { username: 'x', password: 'y' } })).status, 404);
  assert.equal((await c.login('desconocida', owner.password)).status, 401);
});

test('vista local sin contraseña: solo en 127.0.0.1 y nunca en producción', async t => {
  const { loadConfig } = await import('../src/config.mjs');
  assert.throws(() => loadConfig({ LOCAL_NO_AUTH: 'true', NODE_ENV: 'production' }), /production/);
  assert.throws(() => loadConfig({ LOCAL_NO_AUTH: 'true', HOST: '0.0.0.0' }), /127\.0\.0\.1/);
  const app = await startApp({ env: { LOCAL_NO_AUTH: 'true' } });
  t.after(() => app.close());
  const c = client(app.base);
  assert.equal((await c.request('/admin/')).status, 200);
  const session = await c.request('/api/session');
  assert.equal(session.data.local, true);
  assert.equal((await c.request('/api/leads', { method: 'POST', body: validLead })).status, 403, 'el CSRF sigue siendo obligatorio');
  const ok = await c.request('/api/leads', { method: 'POST', body: validLead, headers: { 'X-CSRF-Token': session.data.csrfToken } });
  assert.equal(ok.status, 201);
});

test('una cookie mal formada no provoca un error interno', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  const res = await fetch(`${app.base}/api/leads`, { headers: { Cookie: `otra=%E0%A4%A; ${c.cookie}` } });
  assert.equal(res.status, 200, 'la cookie válida sigue funcionando');
  assert.equal((await fetch(`${app.base}/admin/`, { headers: { Cookie: 'flores_sid=%' }, redirect: 'manual' })).status, 303);
});
