import { validateRequest, ValidationError } from './shared/validation.js';

const section = document.getElementById('solicitud');
const form = document.getElementById('request-form');
const feedback = document.getElementById('request-feedback');
const submit = document.getElementById('request-submit');
// Una clave por solicitud: si el envío se repite (doble clic, reintento tras corte), el servidor no crea otro registro.
let requestKey = crypto.randomUUID();
let sending = false;

function say(message, error = false) {
  feedback.textContent = message;
  feedback.classList.toggle('error', error);
}

function markField(field) {
  for (const input of form.elements) input.removeAttribute?.('aria-invalid');
  const input = field && form.elements[field];
  if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); }
}

async function init() {
  // El formulario solo se muestra si el servidor lo tiene activado; sin JavaScript o sin servidor quedan el teléfono y el correo.
  try {
    const { mode } = await fetch('/api/public/form').then(res => (res.ok ? res.json() : {}));
    if (mode !== 'test' && mode !== 'live') return;
    document.getElementById('form-test-notice').hidden = mode !== 'test';
    section.hidden = false;
  } catch { /* sin servidor: no se muestra el formulario */ }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const values = Object.fromEntries(new FormData(form));
  let data;
  try {
    data = validateRequest(values);
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    markField(error.field);
    return say(error.message, true);
  }
  markField(null);
  sending = true;
  submit.disabled = true;
  submit.textContent = 'Enviando…';
  say('Enviando solicitud…');
  try {
    const res = await fetch('/api/public/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, website: values.website, requestKey }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      markField(body.field);
      return say(`${body.error || 'No se ha podido enviar la solicitud.'} Tus datos siguen en el formulario.`, true);
    }
    // Solo se confirma tras la respuesta correcta del servidor, que ya ha guardado la solicitud.
    form.reset();
    requestKey = crypto.randomUUID();
    say('Solicitud recibida. Nos pondremos en contacto contigo por el medio que has indicado.');
  } catch {
    say('No se ha podido enviar por un problema de conexión. Tus datos siguen en el formulario: inténtalo de nuevo.', true);
  } finally {
    sending = false;
    submit.disabled = false;
    submit.textContent = 'Enviar solicitud';
  }
});

init();
