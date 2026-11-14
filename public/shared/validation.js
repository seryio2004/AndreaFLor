// Reglas de validación compartidas por navegador y servidor. El servidor siempre vuelve a validar.
export const states = Object.freeze({ nuevo: 'Nuevo', contactado: 'Contactado', interesado: 'Interesado', cliente: 'Cliente', descartado: 'Descartado' });
export const sources = Object.freeze({ manual: 'Manual', web: 'Web' });
export const areas = Object.freeze(['Vigo', 'Ourense']);
export const limits = Object.freeze({ business: 120, contact: 120, town: 100, phone: 30, email: 160, notes: 2000, nextAction: 200, message: 1000 });

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const phonePattern = /^\+?[\d\s().-]+$/;

function text(input, key, label, { required = false } = {}) {
  const raw = input?.[key];
  if (raw !== undefined && raw !== null && typeof raw !== 'string') throw new ValidationError(`${label}: formato no válido.`, key);
  const value = (raw ?? '').trim();
  if (required && !value) throw new ValidationError(`Indica ${label.toLowerCase()}.`, key);
  if (value.length > limits[key]) throw new ValidationError(`${label}: máximo ${limits[key]} caracteres.`, key);
  return value;
}

export function phoneDigits(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function contactChannels(input) {
  const phone = text(input, 'phone', 'Teléfono');
  const email = text(input, 'email', 'Correo electrónico').toLowerCase();
  if (!phone && !email) throw new ValidationError('Indica al menos un teléfono o un correo electrónico.', 'phone');
  if (email && !emailPattern.test(email)) throw new ValidationError('Revisa el formato del correo electrónico.', 'email');
  const digits = phoneDigits(phone).length;
  if (phone && (!phonePattern.test(phone) || digits < 9 || digits > 15)) throw new ValidationError('Revisa el teléfono: debe tener entre 9 y 15 cifras.', 'phone');
  return { phone, email };
}

function area(input) {
  const value = input?.area;
  if (!areas.includes(value)) throw new ValidationError('Selecciona la zona: Vigo u Ourense.', 'area');
  return value;
}

/** Alta o edición interna desde el panel. */
export function validateLead(input) {
  const business = text(input, 'business', 'Nombre de la floristería', { required: true });
  const contact = text(input, 'contact', 'Persona de contacto');
  const town = text(input, 'town', 'Localidad', { required: true });
  const zone = area(input);
  const { phone, email } = contactChannels(input);
  const status = input?.status;
  if (typeof status !== 'string' || !Object.hasOwn(states, status)) throw new ValidationError('Selecciona un estado válido.', 'status');
  const followUp = text({ followUp: input?.followUp ?? '' }, 'followUp', 'Fecha de seguimiento');
  if (followUp && !isValidDate(followUp)) throw new ValidationError('La fecha de seguimiento no es válida.', 'followUp');
  const nextAction = text(input, 'nextAction', 'Próxima acción');
  const notes = text(input, 'notes', 'Notas');
  return { business, contact, town, area: zone, phone, email, status, followUp, nextAction, notes };
}

/** Solicitud de información enviada desde la landing. */
export function validateRequest(input) {
  const business = text(input, 'business', 'Nombre de la floristería', { required: true });
  const town = text(input, 'town', 'Localidad', { required: true });
  const zone = area(input);
  const { phone, email } = contactChannels(input);
  const message = text(input, 'message', 'Mensaje');
  return { business, town, area: zone, phone, email, message };
}
