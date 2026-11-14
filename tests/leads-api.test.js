import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { startApp, client, validLead, validRequest } from './helpers.js';

test('alta, consulta, edición y borrado de contactos', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  const created = await c.request('/api/leads', { method: 'POST', body: { ...validLead, source: 'web', id: 'inyectado' } });
  assert.equal(created.status, 201);
  const lead = created.data.lead;
  assert.equal(lead.source, 'manual', 'el origen de un alta interna no lo decide el cliente');
  assert.notEqual(lead.id, 'inyectado');

  const updated = await c.request(`/api/leads/${lead.id}`, { method: 'PUT', body: { ...validLead, status: 'interesado', followUp: '2026-11-20', nextAction: 'Llamar', updatedAt: lead.updatedAt } });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.lead.status, 'interesado');
  assert.equal(updated.data.lead.followUp, '2026-11-20');
  assert.equal(updated.data.lead.createdAt, lead.createdAt);

  const stale = await c.request(`/api/leads/${lead.id}`, { method: 'PUT', body: { ...validLead, updatedAt: '2000-01-01T00:00:00.000Z' } });
  assert.equal(stale.status, 409, 'no sobrescribe cambios hechos desde otra pestaña');

  assert.equal((await c.request(`/api/leads/${lead.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.request(`/api/leads/${lead.id}`)).status, 404);
  assert.equal((await c.request(`/api/leads/${lead.id}`, { method: 'DELETE' })).status, 404);
});

test('validación de servidor y límites de tamaño', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  const cases = [
    [{ ...validLead, business: '' }, 'business'],
    [{ ...validLead, phone: '', email: '' }, 'phone'],
    [{ ...validLead, email: 'incorrecto' }, 'email'],
    [{ ...validLead, phone: '123' }, 'phone'],
    [{ ...validLead, area: 'Lugo' }, 'area'],
    [{ ...validLead, status: '__proto__' }, 'status'],
    [{ ...validLead, followUp: '2026-02-30' }, 'followUp'],
    [{ ...validLead, notes: 'x'.repeat(2001) }, 'notes'],
    [{ ...validLead, business: { $ne: '' } }, 'business'],
  ];
  for (const [body, field] of cases) {
    const res = await c.request('/api/leads', { method: 'POST', body });
    assert.equal(res.status, 422, field);
    assert.equal(res.data.field, field);
  }
  assert.equal((await c.request('/api/leads', { method: 'POST', body: { ...validLead, notes: 'x'.repeat(20_000) } })).status, 413);
  const raw = await fetch(`${app.base}/api/leads`, { method: 'POST', headers: { Cookie: c.cookie, 'Content-Type': 'text/plain' }, body: 'x' });
  assert.ok([403, 415].includes(raw.status));
  assert.equal((await c.request('/api/leads')).data.leads.length, 0, 'ninguna petición inválida se ha guardado');
});

test('consultas parametrizadas: los textos con comillas se guardan literalmente', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  const business = "Flores O'Neill'); DROP TABLE leads;--";
  assert.equal((await c.request('/api/leads', { method: 'POST', body: { ...validLead, business } })).status, 201);
  const { leads } = (await c.request('/api/leads')).data;
  assert.equal(leads[0].business, business);
});

test('los datos persisten tras reiniciar y se ven desde otra sesión autorizada', async t => {
  const dir = mkdtempSync(path.join(tmpdir(), 'flores-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const databasePath = path.join(dir, 'prueba.db');
  const first = await startApp({ databasePath });
  const a = client(first.base);
  await a.login();
  await a.request('/api/leads', { method: 'POST', body: validLead });
  await first.close();

  const second = await startApp({ databasePath });
  t.after(() => second.close());
  const b = client(second.base);
  await b.login();
  const { leads } = (await b.request('/api/leads')).data;
  assert.equal(leads.length, 1);
  assert.equal(leads[0].business, validLead.business);
});

test('posibles duplicados se marcan sin descartar ningún registro', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const c = client(app.base);
  await c.login();
  await c.request('/api/leads', { method: 'POST', body: { ...validLead, email: '', phone: '600 000 000' } });
  await c.request('/api/leads', { method: 'POST', body: { ...validLead, business: 'Otra', email: '', phone: '600-000-000' } });
  await c.request('/api/leads', { method: 'POST', body: { ...validLead, business: 'Distinta', email: 'otra@example.com', phone: '' } });
  const { leads } = (await c.request('/api/leads')).data;
  assert.equal(leads.length, 3);
  assert.deepEqual(leads.map(l => l.possibleDuplicates.length).sort(), [0, 1, 1]);
});

test('recorrido completo: solicitud pública → contacto nuevo → seguimiento → estado → borrado', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const visitor = client(app.base);
  assert.deepEqual((await visitor.request('/api/public/form')).data, { mode: 'test' });
  const sent = await visitor.request('/api/public/requests', { method: 'POST', body: validRequest });
  assert.equal(sent.status, 201);

  const c = client(app.base);
  await c.login();
  let [lead] = (await c.request('/api/leads')).data.leads;
  assert.equal(lead.source, 'web');
  assert.equal(lead.status, 'nuevo');
  assert.equal(lead.message, validRequest.message);

  lead = (await c.request(`/api/leads/${lead.id}`, { method: 'PUT', body: { ...lead, followUp: '2026-11-18', nextAction: 'Llamar para concretar reparto' } })).data.lead;
  assert.equal(lead.followUp, '2026-11-18');
  lead = (await c.request(`/api/leads/${lead.id}`, { method: 'PUT', body: { ...lead, status: 'interesado' } })).data.lead;
  assert.equal(lead.status, 'interesado');
  assert.equal(lead.source, 'web', 'editar no cambia el origen');
  assert.equal(lead.message, validRequest.message, 'editar conserva el mensaje original');
  assert.equal((await c.request(`/api/leads/${lead.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await c.request('/api/leads')).data.leads.length, 0);
});

test('solicitudes públicas: validación, reenvío accidental, campo trampa y límite', async t => {
  const app = await startApp();
  t.after(() => app.close());
  const v = client(app.base);
  const post = body => v.request('/api/public/requests', { method: 'POST', body });

  assert.equal((await post({ ...validRequest, email: '', phone: '' })).status, 422);
  assert.equal((await post({ ...validRequest, requestKey: '' })).status, 400);
  assert.equal((await post(validRequest)).status, 201);
  assert.equal((await post(validRequest)).status, 200, 'el doble clic con la misma clave no crea otro registro');
  assert.equal((await post({ ...validRequest, requestKey: 'clave-de-prueba-0002', website: 'http://spam' })).status, 400);
  const limited = await post({ ...validRequest, requestKey: 'clave-de-prueba-0003' });
  assert.equal(limited.status, 429, 'sexto intento en 10 minutos desde la misma IP');

  const c = client(app.base);
  await c.login();
  assert.equal((await c.request('/api/leads')).data.leads.length, 1);
});

test('formulario desactivado: el servidor rechaza solicitudes', async t => {
  const app = await startApp({ env: { PUBLIC_FORM: 'off' } });
  t.after(() => app.close());
  const v = client(app.base);
  assert.deepEqual((await v.request('/api/public/form')).data, { mode: 'off' });
  assert.equal((await v.request('/api/public/requests', { method: 'POST', body: validRequest })).status, 503);
});
