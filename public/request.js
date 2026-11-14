import { validateRequest, ValidationError } from './shared/validation.js';

// Textos de la interfaz en el idioma de la página (los mensajes de validación del servidor están en castellano).
const lang = document.documentElement.lang === 'gl' ? 'gl' : 'es';
const t = {
  es: {
    sending: 'Enviando solicitud…', send: 'Enviar solicitud', sendingButton: 'Enviando…',
    failed: 'No se ha podido enviar la solicitud.', kept: 'Tus datos siguen en el formulario.',
    network: 'No se ha podido enviar por un problema de conexión. Tus datos siguen en el formulario: inténtalo de nuevo.',
    ok: 'Solicitud recibida. Nos pondremos en contacto contigo por el medio que has indicado.',
    reason: { santos: 'Reserva Todos los Santos', sanvalentin: 'Reserva San Valentín', madre: 'Reserva Día de la Madre' },
  },
  gl: {
    sending: 'Enviando a solicitude…', send: 'Enviar solicitude', sendingButton: 'Enviando…',
    failed: 'Non se puido enviar a solicitude.', kept: 'Os teus datos seguen no formulario.',
    network: 'Non se puido enviar por un problema de conexión. Os teus datos seguen no formulario: téntao de novo.',
    ok: 'Solicitude recibida. Poñerémonos en contacto contigo polo medio que indicaches.',
    reason: { santos: 'Reserva Santos', sanvalentin: 'Reserva San Valentín', madre: 'Reserva Día da Nai' },
  },
}[lang];

const section = document.getElementById('solicitud');
const form = document.getElementById('request-form');
const feedback = document.getElementById('request-feedback');
const submit = document.getElementById('request-submit');
// Una clave por solicitud: si el envío se repite (doble clic, reintento tras corte), el servidor no crea otro registro.
let requestKey = crypto.randomUUID();
let sending = false;
let formReady = false;

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
  // El formulario solo se muestra si el servidor lo tiene activado. En GitHub Pages (sin servidor)
  // queda oculto y el contacto se hace por teléfono, correo o WhatsApp.
  if (document.querySelector('meta[name="sitio-estatico"]')) return; // versión para GitHub Pages: no hay API
  try {
    const { mode } = await fetch('/api/public/form').then(res => (res.ok ? res.json() : {}));
    if (mode !== 'test' && mode !== 'live') return;
    document.getElementById('form-test-notice').hidden = mode !== 'test';
    section.hidden = false;
    formReady = true;
  } catch { /* sin servidor: no se muestra el formulario */ }
}

// Botones «Reservar» de la sección de campañas: llevan al contacto con el motivo ya elegido.
document.addEventListener('click', event => {
  const link = event.target.closest?.('[data-campaign]');
  if (!link) return;
  if (!formReady) return; // sin formulario, el enlace lleva a los datos de contacto
  event.preventDefault();
  form.elements.motivo.value = link.dataset.campaign;
  section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  form.elements.business.focus({ preventScroll: true });
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (sending) return;
  const values = Object.fromEntries(new FormData(form));
  const reason = t.reason[values.motivo];
  let data;
  try {
    data = validateRequest({ ...values, message: reason ? `[${reason}] ${values.message ?? ''}`.trim() : values.message });
  } catch (error) {
    if (!(error instanceof ValidationError)) throw error;
    markField(error.field);
    return say(error.message, true);
  }
  markField(null);
  sending = true;
  submit.disabled = true;
  submit.textContent = t.sendingButton;
  say(t.sending);
  try {
    const res = await fetch('/api/public/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, website: values.website, requestKey }) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      markField(body.field);
      return say(`${body.error || t.failed} ${t.kept}`, true);
    }
    // Solo se confirma tras la respuesta correcta del servidor, que ya ha guardado la solicitud.
    form.reset();
    requestKey = crypto.randomUUID();
    say(t.ok);
  } catch {
    say(t.network, true);
  } finally {
    sending = false;
    submit.disabled = false;
    submit.textContent = t.send;
  }
});

init();
