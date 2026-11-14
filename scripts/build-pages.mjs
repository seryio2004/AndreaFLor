// Prepara la versión estática de la web para GitHub Pages en _site/.
// Solo copia la parte pública: landing (es y gl), privacidad, estilos, scripts, imágenes y datos.
// No incluye el panel (/admin/), el acceso, la API ni la demo: GitHub Pages no ejecuta el servidor.
// Sin servidor, el formulario de solicitud no aparece y el contacto se hace por teléfono o correo.
// Mientras sea una vista previa, añade noindex a las páginas (PAGES_INDEX=true para permitir indexar).
import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const out = '_site';
const include = ['index.html', 'gl', 'privacidad', 'styles.css', 'favicon.svg', 'config.js', 'contact.js', 'request.js', 'field.js', 'map.js', 'shared', 'img', 'data'];
const pages = ['index.html', 'gl/index.html', 'privacidad/index.html'];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of include) {
  const from = path.join('public', item);
  if (!existsSync(from)) throw new Error(`Falta ${from}`);
  cpSync(from, path.join(out, item), { recursive: true, filter: src => !src.endsWith('.md') });
}
writeFileSync(path.join(out, '.nojekyll'), '');

// Marca de sitio estático: el formulario no consulta la API, que en GitHub Pages no existe
for (const page of pages) {
  const file = path.join(out, page);
  writeFileSync(file, readFileSync(file, 'utf8').replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="sitio-estatico" content="true">'));
}

if (process.env.PAGES_INDEX !== 'true') {
  for (const page of pages) {
    const file = path.join(out, page);
    const html = readFileSync(file, 'utf8');
    if (!html.includes('name="robots"')) writeFileSync(file, html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n  <meta name="robots" content="noindex">'));
  }
}

// Comprobación: ninguna página debe usar rutas absolutas, que fallarían en https://usuario.github.io/repositorio/
for (const page of pages) {
  const html = readFileSync(path.join(out, page), 'utf8');
  const absolute = [...html.matchAll(/(?:href|src)="\/(?!\/)[^"]*"/g)].map(m => m[0]);
  if (absolute.length) throw new Error(`${page} usa rutas absolutas: ${absolute.join(', ')}`);
}
console.log(`Web estática lista en ${out}/ (${include.length} elementos${process.env.PAGES_INDEX === 'true' ? '' : ', con noindex'}).`);
