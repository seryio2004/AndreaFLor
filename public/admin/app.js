import { states, sources, validateLead, ValidationError, matches, isDue } from './leads.js';

const $ = id => document.getElementById(id);
const form = $('lead-form');
let leads = [];
let editing = null;
let csrfToken = '';
let busy = false;

function notify(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}

class ApiError extends Error {
  constructor(status, message, field) { super(message); this.status = status; this.field = field; }
}

/** Llamada a la API. Solo se considera guardado lo que el servidor confirma con una respuesta correcta. */
async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { 'X-CSRF-Token': csrfToken } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'No hay conexión con el servidor. No se ha guardado ningún cambio.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    sessionExpired();
    throw new ApiError(401, 'La sesión ha caducado. Vuelve a iniciar sesión; los cambios no guardados se han conservado en el formulario.');
  }
  if (!res.ok) throw new ApiError(res.status, data.error || 'El servidor no ha podido completar la operación.', data.field);
  return data;
}

function sessionExpired() {
  $('new-lead').disabled = true;
  const link = document.createElement('a');
  link.href = '/acceso/';
  link.textContent = 'Iniciar sesión de nuevo';
  $('feedback').replaceChildren('La sesión ha caducado. ', link);
  $('feedback').classList.add('error');
}

const headings = ['Floristería', 'Zona', 'Contacto', 'Estado', 'Seguimiento', 'Gestión'];

function cell(row, text, subtext) {
  const td = document.createElement('td');
  td.dataset.label = headings[row.children.length] ?? '';
  td.append(text);
  if (subtext) { const small = document.createElement('small'); small.textContent = subtext; td.append(small); }
  row.append(td);
  return td;
}

function badge(text, kind = '') {
  const span = document.createElement('span');
  span.className = `status ${kind}`.trim();
  span.textContent = text;
  return span;
}

function render() {
  $('total').textContent = leads.length;
  $('new-count').textContent = leads.filter(lead => lead.status === 'nuevo').length;
  $('interested').textContent = leads.filter(lead => lead.status === 'interesado').length;
  $('due').textContent = leads.filter(lead => isDue(lead)).length;
  const source = $('source').value;
  const visible = leads.filter(lead => matches(lead, $('search').value, $('area').value, $('status').value) && (!source || lead.source === source));
  const rows = visible.map(lead => {
    const row = document.createElement('tr');
    const name = cell(row, lead.business, lead.town);
    if (lead.possibleDuplicates.length) name.append(badge('Posible duplicado', 'warn'));
    cell(row, lead.area);
    cell(row, lead.contact || 'Sin persona asignada', [lead.phone, lead.email].filter(Boolean).join(' · '));
    const status = cell(row, badge(states[lead.status]));
    status.append(badge(sources[lead.source], lead.source === 'web' ? 'web' : 'quiet'));
    cell(row, lead.followUp ? lead.followUp.split('-').reverse().join('/') : 'Sin fecha', [isDue(lead) ? 'Pendiente' : '', lead.nextAction].filter(Boolean).join(' · '));
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'text-button';
    edit.textContent = 'Editar';
    edit.setAttribute('aria-label', `Editar ${lead.business}`);
    edit.addEventListener('click', () => open(lead));
    cell(row, edit);
    return row;
  });
  $('rows').replaceChildren(...rows);
  $('table-wrap').hidden = !visible.length;
  $('empty').hidden = Boolean(visible.length);
  $('retry').hidden = true;
  $('empty-text').textContent = leads.length ? 'No hay contactos que coincidan con los filtros.' : 'No hay contactos todavía. Las solicitudes de la web y las altas manuales aparecerán aquí.';
}

async function load() {
  $('empty').hidden = false;
  $('table-wrap').hidden = true;
  $('retry').hidden = true;
  $('empty-text').textContent = 'Cargando contactos…';
  try {
    leads = (await api('/api/leads')).leads;
    render();
    $('new-lead').disabled = false;
  } catch (error) {
    $('empty-text').textContent = `No se han podido cargar los contactos. ${error.status === 401 ? '' : error.message}`;
    $('retry').hidden = error.status === 401;
  }
}

function clearFieldErrors() {
  for (const field of form.elements) field.removeAttribute?.('aria-invalid');
  $('form-error').textContent = '';
}

function showFieldError(message, field) {
  $('form-error').textContent = message;
  const input = field && form.elements[field];
  if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
}

function open(lead = null) {
  editing = lead;
  form.reset();
  clearFieldErrors();
  if (lead) for (const field of form.elements) if (field.name && Object.hasOwn(lead, field.name)) field.value = lead[field.name];
  $('editor-title').textContent = lead ? `Editar · ${lead.business}` : 'Nuevo contacto';
  $('editor-meta').hidden = !lead;
  if (lead) {
    const created = new Date(lead.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const updated = new Date(lead.updatedAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    $('editor-meta').textContent = `Origen: ${sources[lead.source]} · Alta: ${created} · Última modificación: ${updated}${lead.possibleDuplicates.length ? ` · Comparte teléfono o correo con ${lead.possibleDuplicates.length} contacto(s): revisa si es la misma floristería antes de eliminar.` : ''}`;
  }
  $('request-message').hidden = !lead?.message;
  $('request-text').textContent = lead?.message ?? '';
  $('delete').hidden = !lead;
  $('editor').hidden = false;
  $('editor').scrollIntoView({ block: 'start' });
  form.elements.business.focus();
}

function close() {
  $('editor').hidden = true;
  editing = null;
  $('new-lead').focus();
}

function setBusy(value, label) {
  busy = value;
  for (const id of ['save', 'cancel', 'delete']) $(id).disabled = value;
  $('save').textContent = value && label ? label : 'Guardar contacto';
}

$('new-lead').addEventListener('click', () => open());
$('cancel').addEventListener('click', close);
$('retry').addEventListener('click', load);
for (const id of ['search', 'area', 'status', 'source']) $(id).addEventListener(id === 'search' ? 'input' : 'change', render);

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  clearFieldErrors();
  let data;
  try {
    data = validateLead(Object.fromEntries(new FormData(form)));
  } catch (error) {
    if (error instanceof ValidationError) return showFieldError(error.message, error.field);
    throw error;
  }
  setBusy(true, 'Guardando…');
  try {
    if (editing) await api(`/api/leads/${editing.id}`, { method: 'PUT', body: { ...data, updatedAt: editing.updatedAt } });
    else await api('/api/leads', { method: 'POST', body: data });
    close();
    notify('Contacto guardado.');
    await load();
  } catch (error) {
    showFieldError(error.message, error.field);
  } finally {
    setBusy(false);
  }
});

$('delete').addEventListener('click', async () => {
  if (!editing || busy || !window.confirm(`¿Eliminar definitivamente el contacto «${editing.business}»? Esta acción no se puede deshacer desde el panel.`)) return;
  setBusy(true);
  try {
    await api(`/api/leads/${editing.id}`, { method: 'DELETE' });
    close();
    notify('Contacto eliminado.');
    await load();
  } catch (error) {
    showFieldError(error.message);
  } finally {
    setBusy(false);
  }
});

$('logout').addEventListener('click', async () => {
  try {
    await api('/api/session', { method: 'DELETE' });
    window.location.assign('/acceso/');
  } catch (error) {
    if (error.status !== 401) notify(`No se ha podido cerrar la sesión: ${error.message}`, true);
  }
});

try {
  const session = await api('/api/session');
  csrfToken = session.csrfToken;
  $('user').textContent = session.username;
  if (session.local) {
    // Vista previa local (npm run local): no hay sesión que cerrar.
    $('logout').hidden = true;
    $('env-notice').querySelector('strong').textContent = 'Vista local sin contraseña.';
  }
  const { mode } = await fetch('/api/public/form').then(res => res.json()).catch(() => ({}));
  $('env-notice').hidden = mode === 'live';
  await load();
} catch (error) {
  if (error.status !== 401) notify(error.message, true);
}
