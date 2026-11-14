// Ilustración de la portada al estilo óleo: el interior de un invernadero con bancadas en flor,
// cestas colgantes y pasillo de grava, pintado con pinceladas sobre una escena 3D proyectada en perspectiva.
// Uso: node scripts/generate-hero.mjs  → art/invernadero-oleo.svg (determinista)
// Después: node scripts/render-hero.mjs  → public/img/invernadero-oleo.jpg (lo que usa la web)
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1600;
const H = 900;
const CX = 1010; // punto de fuga a la derecha: el texto ocupa la izquierda
const CY = 455;
const F = 640;

let seed = 23;
const r = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = list => list[Math.floor(r() * list.length)];
const f = n => n.toFixed(1);
const P = (x, y, z) => [CX + (F * x) / z, CY - (F * y) / z];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Variación de color de pincel: pequeño cambio de tono y luminosidad sobre el color base
function hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const rr = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const max = Math.max(rr, g, b); const min = Math.min(rr, g, b);
  let h = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === rr ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - rr) / d + 2 : (rr - g) / d + 4;
    h *= 60;
  }
  return [h, s * 100, l * 100];
}
const vary = (hex, dl = 6, dh = 6) => {
  const [h, s, l] = hexToHsl(hex);
  return `hsl(${f(h + (r() - 0.5) * 2 * dh)} ${f(clamp(s + (r() - 0.5) * 8, 0, 100))}% ${f(clamp(l + (r() - 0.5) * 2 * dl, 3, 98))}%)`;
};

const dabs = []; // { z, svg }
const under = []; // manchas de color base bajo las pinceladas

/** Mancha base: un cuadrilátero 3D proyectado y relleno. */
function quad(points, color) {
  under.push(`<path d="M${points.map(p => P(...p).map(f).join(' ')).join(' L')} Z" fill="${color}"/>`);
}

/** Pincelada: trazo corto y curvo, de extremos redondeados. */
function dab(x, y, z, len, angle, width, color, opacity = 1) {
  const dx = Math.cos(angle) * len / 2;
  const dy = Math.sin(angle) * len / 2;
  const bend = (r() - 0.5) * len * 0.35;
  const mx = x - Math.sin(angle) * bend;
  const my = y + Math.cos(angle) * bend;
  dabs.push({ z, svg: `<path d="M${f(x - dx)} ${f(y - dy)} Q${f(mx)} ${f(my)} ${f(x + dx)} ${f(y + dy)}" stroke="${color}" stroke-width="${f(width)}"${opacity < 1 ? ` stroke-opacity="${opacity}"` : ''}/>` });
}
/** Pincelada sobre un punto 3D, orientada según la perspectiva hacia `toward`. */
function dab3(p, toward, size, color, opacity, stretch = 1, maxWidth = 18) {
  const [x, y] = P(...p);
  const [tx, ty] = P(...toward);
  const angle = Math.atan2(ty - y, tx - x) + (r() - 0.5) * 0.35;
  const s = F / p[2];
  const width = clamp(size * s, 1.4, maxWidth) * (0.75 + r() * 0.5);
  dab(x, y, p[2], width * (1.5 + r() * 1.2) * stretch, angle, width, color, opacity * (0.82 + r() * 0.18));
}

const EAVE = 1.5;
const RIDGE = 3.6;
const WALL = 6.2;
const FLOOR = -1.6;
const TOP = -0.75;
const ZN = 1.7;
const ZBACK = 44;
const zLog = () => ZN * (ZBACK / ZN) ** r();
const ZNEAR_BENCH = 2.6;

// 0. Capa base: cada zona con su color antes de pintar encima
for (const side of [-1, 1]) {
  quad([[side * WALL, FLOOR, ZN], [side * WALL, EAVE, ZN], [side * WALL, EAVE, ZBACK], [side * WALL, FLOOR, ZBACK]], '#b8c8b0');
  quad([[side * 1.3, FLOOR, ZN], [side * WALL, FLOOR, ZN], [side * WALL, FLOOR, ZBACK], [side * 1.3, FLOOR, ZBACK]], '#38443a');
}
quad([[-1.3, FLOOR, ZN], [1.3, FLOOR, ZN], [1.3, FLOOR, ZBACK], [-1.3, FLOOR, ZBACK]], '#c2baa7');

// 1. Muro del fondo: luz cálida que entra por el extremo del invernadero
for (let i = 0; i < 260; i += 1) {
  const x = (r() - 0.5) * 2 * WALL;
  const top = EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / WALL);
  const y = FLOOR + r() * (top - FLOOR);
  dab3([x, y, ZBACK], [x + 1, y, ZBACK], 0.5, vary(pick(['#fbf3d6', '#f7ecc6', '#fdf8e6', '#efe6c4']), 4), 1);
}

// 2. Cubierta acristalada y paredes laterales: claras, más cálidas hacia el fondo
for (let i = 0; i < 3600; i += 1) {
  const z = zLog();
  const warm = (z - ZN) / (ZBACK - ZN);
  if (r() < 0.62) {
    const side = r() < 0.5 ? -1 : 1;
    const u = r();
    const p = [side * WALL * (1 - u), EAVE + (RIDGE - EAVE) * u, z];
    const base = warm > 0.55 ? pick(['#f6efd8', '#efeedd', '#f9f4e2']) : pick(['#e3e8dd', '#d6dfd2', '#eceee4', '#c9d5c8', '#dfe5d6']);
    dab3(p, [p[0], p[1], z * 1.15], 0.17, vary(base, 5), 0.92, 1, 14);
  } else {
    const side = r() < 0.5 ? -1 : 1;
    const p = [side * WALL, FLOOR + r() * (EAVE - FLOOR), z];
    const base = warm > 0.5 ? pick(['#e9eacd', '#dfe3c4']) : pick(['#a8bd9f', '#bfcfb6', '#8fa88a', '#d3ddca', '#9eb596']);
    dab3(p, [p[0], p[1], z * 1.15], 0.24, vary(base, 6), 0.95);
  }
}

// 3. Estructura: cerchas, aleros y cumbrera pintados como trazos oscuros sobre el vidrio
function paintLine(a, b, size, color) {
  const n = 26;
  for (let i = 0; i < n; i += 1) {
    const t = i / n;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const q = [a[0] + (b[0] - a[0]) * (t + 1 / n), a[1] + (b[1] - a[1]) * (t + 1 / n), a[2] + (b[2] - a[2]) * (t + 1 / n)];
    const [x, y] = P(...p);
    const [x2, y2] = P(...q);
    const s = F / p[2];
    dab((x + x2) / 2, (y + y2) / 2, p[2] - 0.01, Math.hypot(x2 - x, y2 - y) * 1.25, Math.atan2(y2 - y, x2 - x), clamp(size * s, 0.9, 7), vary(color, 5), 0.9);
  }
}
for (let z = 2.2; z < ZBACK; z *= 1.32) {
  const rib = [[-WALL, FLOOR, z], [-WALL, EAVE, z], [0, RIDGE, z], [WALL, EAVE, z], [WALL, FLOOR, z]];
  for (let i = 0; i < rib.length - 1; i += 1) paintLine(rib[i], rib[i + 1], 0.035, '#76857a');
}
for (const [x, y] of [[-WALL, EAVE], [0, RIDGE], [WALL, EAVE], [-WALL / 2, (EAVE + RIDGE) / 2], [WALL / 2, (EAVE + RIDGE) / 2]]) {
  paintLine([x, y, ZN], [x, y, ZBACK], 0.03, '#7f8c82');
}

// 4. Suelo: pasillo de grava clara y sombra bajo las bancadas
for (let i = 0; i < 5200; i += 1) {
  const z = 1.75 + (ZBACK - 2) * r() ** 2.6;
  const x = (r() - 0.5) * 2 * (r() < 0.6 ? 1.3 : WALL);
  if (Math.abs(x) > 1.3) {
    dab3([x, FLOOR, z], [x, FLOOR, z * 1.2], 0.08, vary(pick(['#2e3a31', '#3d4a3e', '#4a5a48', '#566552', '#34402f']), 6), 1, 0.8, 22);
    continue;
  }
  const center = 1 - Math.abs(x) / 1.3;
  const base = center > 0.35 ? pick(['#cfc7b5', '#bdb5a2', '#d9d2c1', '#a9a290', '#c6bda8']) : pick(['#9d9786', '#8c8676', '#aaa391']);
  dab3([x, FLOOR, z], [x, FLOOR, z * 1.2], 0.06, vary(base, 7, 4), 1, 0.7);
}

// 5. Bancadas: frente oscuro, follaje denso y flores por tandas de color
const benches = [{ x0: -5.4, x1: -1.3, inner: -1.3 }, { x0: 1.3, x1: 5.4, inner: 1.3 }];
const batches = [
  ['#e48aa0', '#f0a8b8', '#d45e7a'], // rosas
  ['#f4efe4', '#faf6ee', '#e9e2d2'], // blancas
  ['#d84a4f', '#e86b62', '#c23a45'], // rojas
  ['#ef8f68', '#f4a982', '#e5744f'], // coral
  ['#b9518d', '#cc6aa3', '#9d3f78'], // magenta
  ['#efc85a', '#f5d97f', '#e3b33f'], // amarillas
];
for (const b of benches) {
  // Frente y sombra inferior
  for (let i = 0; i < 520; i += 1) {
    const z = ZNEAR_BENCH + (ZBACK - 3 - ZNEAR_BENCH) * r() ** 1.6;
    const y = FLOOR + r() * (TOP - FLOOR);
    const base = y > TOP - 0.25 ? pick(['#59665a', '#6c776b']) : pick(['#2f3b33', '#3b473d', '#46524a', '#283229']);
    dab3([b.inner, y, z], [b.inner, y, z * 1.2], 0.09, vary(base, 5), 1, 0.8);
  }
  quad([[b.inner, FLOOR, ZNEAR_BENCH], [b.inner, TOP, ZNEAR_BENCH], [b.inner, TOP, ZBACK - 3], [b.inner, FLOOR, ZBACK - 3]], '#3c483e');
  quad([[b.x0, FLOOR, ZNEAR_BENCH], [b.x1, FLOOR, ZNEAR_BENCH], [b.x1, TOP, ZNEAR_BENCH], [b.x0, TOP, ZNEAR_BENCH]], '#3c483e');
  quad([[b.x0, TOP + 0.15, ZNEAR_BENCH], [b.x1, TOP + 0.15, ZNEAR_BENCH], [b.x1, TOP + 0.15, ZBACK - 4], [b.x0, TOP + 0.15, ZBACK - 4]], '#4f7a4c');
  // Cara frontal de la bancada más cercana y su sombra
  for (let i = 0; i < 700; i += 1) {
    const x = b.x0 + r() * (b.x1 - b.x0);
    const y = FLOOR + r() * (TOP - FLOOR);
    const base = y > TOP - 0.22 ? pick(['#6b7869', '#7d8a7b', '#5d6a5d']) : pick(['#2b362d', '#36433a', '#43513f', '#4f5e4b', '#3a4636']);
    dab3([x, y, ZNEAR_BENCH], [x + 0.3, y, ZNEAR_BENCH], 0.09, vary(base, 6), 1, 0.9, 22);
  }
  // Follaje sobre la bancada
  for (let i = 0; i < 2600; i += 1) {
    const z = ZNEAR_BENCH + (ZBACK - 4 - ZNEAR_BENCH) * r() ** 1.5;
    const x = b.x0 + r() * (b.x1 - b.x0);
    const y = TOP + 0.05 + r() * 0.35;
    dab3([x, y, z], [x + (r() - 0.5) * 0.4, y + 0.3, z], 0.07, vary(pick(['#3f6b45', '#5d8a55', '#7fa36a', '#2f4f36', '#4c7a4f']), 7), 1, 0.9);
  }
  // Flores: tandas de color a lo largo de la bancada, como en un cultivo
  for (let i = 0; i < 2100; i += 1) {
    const z = ZNEAR_BENCH + (ZBACK - 4 - ZNEAR_BENCH) * r() ** 1.5;
    const x = b.x0 + r() * (b.x1 - b.x0);
    const batch = batches[Math.floor(Math.log(z) * 3.1 + (b.inner > 0 ? 2 : 0)) % batches.length];
    const y = TOP + 0.3 + r() * 0.28;
    dab3([x, y, z], [x + 0.2, y + 0.05, z], 0.045, vary(pick(batch), 6, 5), 1, 0.6);
  }
}

// 6. Cestas colgantes: masa de follaje, tallos que caen y flores
function basket(x, z) {
  const y = EAVE - 0.4;
  paintLine([x, EAVE + 0.95, z], [x, RIDGE - 0.4, z], 0.012, '#8d978e');
  for (const dx of [-0.35, 0, 0.35]) paintLine([x + dx, y + 0.05, z], [x, EAVE + 0.95, z], 0.008, '#9aa39b');
  for (let i = 0; i < 46; i += 1) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * 0.5;
    const p = [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.45, z + (r() - 0.5) * 0.3];
    dab3(p, [p[0], p[1] - 0.3, p[2]], 0.08, vary(pick(['#365c3c', '#4f7a4b', '#2b4a31', '#678f5b']), 6), 1);
  }
  for (let i = 0; i < 11; i += 1) {
    const sx = x + (r() - 0.5) * 0.9;
    const len = 0.3 + r() * 0.7;
    for (let k = 0; k < 6; k += 1) {
      const t = k / 6;
      dab3([sx + (r() - 0.5) * 0.05, y - 0.15 - len * t, z], [sx, y - 0.4 - len * t, z], 0.035, vary(pick(['#3f6b45', '#5d8a55']), 6), 1, 0.8);
    }
  }
  const batch = pick(batches);
  for (let i = 0; i < 26; i += 1) {
    const p = [x + (r() - 0.5) * 1.0, y - r() * 0.9, z - 0.2];
    dab3(p, [p[0] + 0.2, p[1], p[2]], 0.05, vary(pick(batch), 6, 5), 1, 0.6);
  }
}
for (const x of [-3.4, 3.4]) for (let z = 4.2; z < ZBACK - 6; z *= 1.42) basket(x + (r() - 0.5) * 0.3, z);

dabs.sort((a, b) => b.z - a.z); // de lejos a cerca, como se pinta

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <filter id="oleo" x="-2%" y="-2%" width="104%" height="104%">
    <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="4" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="12" xChannelSelector="R" yChannelSelector="G"/>
  </filter>
  <filter id="lienzo" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="9"/>
    <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0.9 0"/>
  </filter>
  <linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#d9e0d4"/>
    <stop offset=".5" stop-color="#efeadb"/>
    <stop offset="1" stop-color="#d9d6c8"/>
  </linearGradient>
  <radialGradient id="luz" cx="${f(CX / W)}" cy="${f(CY / H)}" r="0.45">
    <stop offset="0" stop-color="#fff6d8" stop-opacity=".55"/>
    <stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#cielo)"/>
<g filter="url(#oleo)">${under.join('')}<g fill="none" stroke-linecap="round">${dabs.map(d => d.svg).join('')}</g></g>
<rect width="${W}" height="${H}" fill="url(#luz)"/>
<rect width="${W}" height="${H}" filter="url(#lienzo)" opacity=".16" style="mix-blend-mode:multiply"/>
</svg>
`;
mkdirSync('art', { recursive: true });
writeFileSync('art/invernadero-oleo.svg', svg);
console.log(`Óleo generado: art/invernadero-oleo.svg (${dabs.length} pinceladas, ${Math.round(svg.length / 1024)} KB)`);
