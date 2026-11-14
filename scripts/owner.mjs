// Crea la cuenta de acceso al panel o cambia su contraseña. Uso: npm run owner -- <usuario>
// La contraseña se pide por terminal (sin eco) o se lee de OWNER_PASSWORD; nunca se guarda en código.
import { createInterface } from 'node:readline';
import { loadConfig } from '../src/config.mjs';
import { openDatabase } from '../src/db.mjs';
import { authStore, minPasswordLength } from '../src/auth.mjs';

function ask(question) {
  return new Promise(resolve => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = text => { if (text.includes(question)) process.stdout.write(text); };
    rl.question(question, answer => { rl.close(); process.stdout.write('\n'); resolve(answer); });
  });
}

const username = process.argv[2];
if (!username) {
  console.error('Uso: npm run owner -- <usuario>');
  process.exit(1);
}
let password = process.env.OWNER_PASSWORD;
if (!password) {
  if (!process.stdin.isTTY) { console.error('Ejecuta el comando en una terminal interactiva o define OWNER_PASSWORD.'); process.exit(1); }
  password = await ask(`Contraseña (mínimo ${minPasswordLength} caracteres): `);
  if (password !== await ask('Repite la contraseña: ')) { console.error('Las contraseñas no coinciden.'); process.exit(1); }
}

const config = loadConfig();
const db = openDatabase(config.databasePath);
try {
  await authStore(db, { idleMs: config.sessionIdleMs, absoluteMs: config.sessionAbsoluteMs }).setOwner(username, password);
  console.log(`Cuenta «${username}» guardada en ${config.databasePath}. Las sesiones anteriores de esa cuenta se han cerrado.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
