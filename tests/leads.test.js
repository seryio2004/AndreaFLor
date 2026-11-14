import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLead, matches, isDue } from '../public/admin/leads.js';
import { validateRequest } from '../public/shared/validation.js';
import { loadConfig } from '../src/config.mjs';

const input = { business: 'Floristería de prueba', town: 'Ourense', area: 'Ourense', email: 'prueba@example.com', status: 'nuevo' };

test('exige contacto y rechaza entradas inválidas antes de guardarlas', () => {
  assert.throws(() => validateLead({ ...input, email: '' }), { field: 'phone' });
  assert.throws(() => validateLead({ ...input, status: '__proto__' }), { field: 'status' });
  assert.throws(() => validateLead({ ...input, followUp: '2026-02-30' }), { field: 'followUp' });
  assert.throws(() => validateLead({ ...input, email: 'incorrecto' }), { field: 'email' });
  assert.throws(() => validateLead({ ...input, phone: '12-34' , email: '' }), { field: 'phone' });
  assert.throws(() => validateLead({ ...input, town: ['Vigo'] }), { field: 'town' });
});

test('normaliza espacios y el correo en minúsculas', () => {
  const lead = validateLead({ ...input, business: '  Flores  ', email: ' Prueba@Example.com ' });
  assert.equal(lead.business, 'Flores');
  assert.equal(lead.email, 'prueba@example.com');
});

test('la solicitud pública solo recoge los campos necesarios', () => {
  const request = validateRequest({ ...input, message: 'Hola', status: 'cliente', notes: 'x', contact: 'y' });
  assert.deepEqual(Object.keys(request).sort(), ['area', 'business', 'email', 'message', 'phone', 'town']);
});

test('búsqueda sin tildes y filtros combinados', () => {
  const lead = validateLead(input);
  assert.ok(matches(lead, 'floristeria', 'Ourense', 'nuevo'));
  assert.equal(matches(lead, '', 'Vigo', ''), false);
});

test('seguimientos incluyen hoy y vencidos, excluyen estados cerrados', () => {
  const lead = validateLead({ ...input, followUp: '2026-11-14' });
  assert.ok(isDue(lead, '2026-11-14'));
  assert.ok(isDue(lead, '2026-11-15'));
  assert.equal(isDue(lead, '2026-11-13'), false);
  assert.equal(isDue({ ...lead, status: 'descartado' }, '2026-11-14'), false);
});

test('el formulario real no se activa sin datos, aviso revisado y HTTPS', () => {
  assert.equal(loadConfig({}).publicForm, 'test');
  assert.equal(loadConfig({ NODE_ENV: 'production' }).publicForm, 'off');
  assert.throws(() => loadConfig({ PUBLIC_FORM: 'live', NODE_ENV: 'production', PRIVACY_NOTICE_APPROVED: 'yes' }), /nombre comercial/);
  assert.throws(() => loadConfig({ PUBLIC_FORM: 'otro' }));
});
