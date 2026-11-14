// Comprobación de sintaxis de todos los módulos JavaScript del proyecto (sin dependencias).
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const roots = ['server.mjs', 'src', 'scripts', 'public', 'tests'];
const files = [];
const walk = entry => {
  if (entry === path.join('public', 'demo')) return; // compilado por Vite desde demo/
  if (/\.(m?js)$/.test(entry)) return files.push(entry);
  try { for (const name of readdirSync(entry)) walk(path.join(entry, name)); } catch { /* no es carpeta */ }
};
roots.forEach(walk);
let failed = 0;
for (const file of files) {
  try { execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' }); } catch (error) { failed += 1; console.error(error.stderr.toString()); }
}
console.log(`${files.length - failed}/${files.length} archivos sin errores de sintaxis.`);
process.exit(failed ? 1 : 0);
