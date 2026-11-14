// Vista previa local de todo el proyecto con un solo comando: npm run local
// 1. Instala las dependencias de la demo si faltan y la compila a public/demo.
// 2. Arranca el servidor en 127.0.0.1 con el panel sin contraseña (LOCAL_NO_AUTH) y el formulario en modo de pruebas.
// 3. Abre el navegador en la landing (desactivar con --no-open).
// Solo para ver la web en esta máquina con datos ficticios. No usar para publicar.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'demo');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = Number(process.env.PORT || 3000);
const base = `http://127.0.0.1:${port}`;
const args = new Set(process.argv.slice(2));

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, { cwd, stdio: 'inherit' });
  return result.status === 0;
}

// 1. Demo de Stageshow (opcional: si falla, la web y el panel siguen funcionando)
let demoReady = existsSync(path.join(root, 'public', 'demo', 'index.html'));
if (!args.has('--no-demo')) {
  if (!existsSync(path.join(demo, 'node_modules'))) {
    console.log('› Instalando dependencias de la demo (una sola vez)…');
    run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], demo);
  }
  console.log('› Compilando la demo…');
  demoReady = run(npm, ['run', '-s', 'build'], demo) || demoReady;
  if (!demoReady) console.warn('! No se ha podido compilar la demo; el resto de la web funciona igual.');
}

// 2. Servidor con recarga automática al cambiar archivos del servidor
const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', '--watch', 'server.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), LOCAL_NO_AUTH: 'true', PUBLIC_FORM: 'test', NODE_ENV: 'development' },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', code => process.exit(code ?? 0));

// 3. Esperar a que responda, mostrar direcciones y abrir el navegador
for (let i = 0; i < 50; i += 1) {
  try { if ((await fetch(`${base}/`)).ok) break; } catch { /* aún arrancando */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
console.log(`
  Web local lista (Ctrl+C para parar)
  · Landing ............ ${base}/
  · Panel (sin clave) .. ${base}/admin/
  · Demostración ....... ${demoReady ? `${base}/demo/` : 'no disponible'}
  · Privacidad (borrador) ${base}/privacidad/
  Usa solo datos ficticios.
`);
if (!args.has('--no-open')) {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  spawn(opener, [`${base}/`], { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}
