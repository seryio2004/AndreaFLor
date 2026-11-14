import { business } from '../public/config.js';

const formModes = ['off', 'test', 'live'];

/** Lee y valida la configuración del entorno. Lanza un error descriptivo si es incoherente. */
export function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const publicForm = env.PUBLIC_FORM || (production ? 'off' : 'test');
  if (!formModes.includes(publicForm)) throw new Error(`PUBLIC_FORM debe ser ${formModes.join(', ')}.`);
  const hours = (name, fallback) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isFinite(value) || value <= 0 || value > 24 * 30) throw new Error(`${name} no es válido.`);
    return value * 3_600_000;
  };
  const config = {
    production,
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT || 3000),
    databasePath: env.DATABASE_PATH || 'data/flores.db',
    // En producción la cookie solo viaja por HTTPS (requiere un proxy con TLS delante).
    secureCookies: env.SECURE_COOKIES ? env.SECURE_COOKIES === 'true' : production,
    trustProxy: env.TRUST_PROXY === 'true',
    // Vista previa local sin contraseña (npm run local). Nunca en producción ni fuera de la propia máquina.
    localNoAuth: env.LOCAL_NO_AUTH === 'true',
    publicForm,
    sessionIdleMs: hours('SESSION_IDLE_HOURS', 2),
    sessionAbsoluteMs: hours('SESSION_ABSOLUTE_HOURS', 12),
  };
  if (publicForm === 'live') {
    const missing = [];
    if (!business.name) missing.push('nombre comercial en public/config.js');
    if (!business.phone && !business.email) missing.push('teléfono o correo en public/config.js');
    if (env.PRIVACY_NOTICE_APPROVED !== 'yes') missing.push('PRIVACY_NOTICE_APPROVED=yes tras revisar el aviso de privacidad');
    if (!config.secureCookies) missing.push('HTTPS (SECURE_COOKIES=true o NODE_ENV=production)');
    if (missing.length) throw new Error(`PUBLIC_FORM=live requiere: ${missing.join('; ')}.`);
  }
  if (config.localNoAuth) {
    if (production) throw new Error('LOCAL_NO_AUTH no se permite con NODE_ENV=production.');
    if (!['127.0.0.1', 'localhost', '::1'].includes(config.host)) throw new Error('LOCAL_NO_AUTH solo se permite escuchando en 127.0.0.1.');
    if (publicForm === 'live') throw new Error('LOCAL_NO_AUTH no se permite con PUBLIC_FORM=live.');
  }
  return config;
}
