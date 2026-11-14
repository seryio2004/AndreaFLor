// Convierte la ilustración al óleo (SVG con miles de pinceladas y filtros) en un JPEG ligero para la web.
// Usa Chrome o Chromium sin interfaz por el protocolo de depuración (CHROME_PATH para indicar el binario).
// Uso: node scripts/render-hero.mjs  → public/img/invernadero-oleo.jpg
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import path from 'node:path';

const svg = readFileSync('art/invernadero-oleo.svg');
const page = '<!doctype html><style>html,body{margin:0;background:#e7e6da}img{display:block;width:1600px;height:900px}</style><img src="/oleo.svg">';
const server = createServer((req, res) => {
  if (req.url === '/oleo.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(svg); }
  res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(page);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;

const candidates = [process.env.CHROME_PATH, 'chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable'].filter(Boolean);
const port = 9400 + Math.floor(Math.random() * 400);
// El perfil temporal va en la carpeta personal: Chromium instalado como snap no puede escribir en /tmp
const profile = mkdtempSync(path.join(process.platform === 'linux' ? path.join(homedir(), 'snap', 'chromium', 'common') : tmpdir(), 'render-hero-'));
let browser;
for (const bin of candidates) {
  try {
    browser = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
    await new Promise((resolve, reject) => { browser.once('error', reject); setTimeout(resolve, 600); });
    break;
  } catch { browser = null; }
}
if (!browser) { console.error('No se encuentra Chrome ni Chromium. Indica la ruta con CHROME_PATH.'); process.exit(1); }

let target;
for (let i = 0; i < 50 && !target; i += 1) {
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* arrancando */ }
  if (!target) await new Promise(resolve => setTimeout(resolve, 200));
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => ws.addEventListener('open', resolve));
let id = 0;
const pending = new Map();
ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise(resolve => { const i = ++id; pending.set(i, resolve); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1.5, mobile: false });
await send('Page.enable');
await send('Page.navigate', { url });
await new Promise(resolve => setTimeout(resolve, 6000)); // los filtros del SVG tardan en pintarse
const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
writeFileSync('public/img/invernadero-oleo.jpg', Buffer.from(shot.result.data, 'base64'));
console.log(`Imagen generada: public/img/invernadero-oleo.jpg (${Math.round(shot.result.data.length * 0.75 / 1024)} KB, 2400 × 1350)`);
ws.close();
await new Promise(resolve => { browser.once('exit', resolve); browser.kill(); setTimeout(resolve, 3000); });
server.close();
try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { console.warn(`No se ha podido borrar el perfil temporal ${profile}`); }
