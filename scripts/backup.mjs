// Copia de seguridad consistente de la base de datos (VACUUM INTO), válida con el servidor en marcha.
// Uso: npm run db:backup [-- <carpeta destino>]   (por defecto ./backups)
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config.mjs';
import { openDatabase } from '../src/db.mjs';

const config = loadConfig();
if (!existsSync(config.databasePath)) { console.error(`No existe la base de datos ${config.databasePath}.`); process.exit(1); }
const dir = path.resolve(process.argv[2] || 'backups');
mkdirSync(dir, { recursive: true });
const target = path.join(dir, `flores-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
const db = openDatabase(config.databasePath);
try {
  db.prepare('VACUUM INTO ?').run(target);
  console.log(`Copia creada: ${target}`);
} finally {
  db.close();
}
