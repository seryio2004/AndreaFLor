// Genera el fondo de la landing: un campo de claveles dibujado a trazo, estilo minimalista.
// Dos capas (fondo y frente) para el efecto de profundidad al hacer scroll.
// Uso: node scripts/generate-field.mjs  → public/img/campo-claveles-{fondo,frente}.svg
// Es determinista (semilla fija): regenerar produce los mismos archivos.
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 1600;
const H = 900;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = n => n.toFixed(1);

function carnation(r, { x, base, height, scale, bud }) {
  const j = (amount = 1.2) => (r() - 0.5) * 2 * amount * scale; // temblor de mano
  const lean = (r() - 0.5) * height * 0.22;
  const tx = x + lean;
  const ty = base - height;
  const parts = [];

  // Tallo: una curva suave con un ligero temblor
  const c1x = x + lean * 0.2 + j(6);
  const c1y = base - height * 0.55;
  parts.push(`<path class="s" d="M${f(x)} ${f(base)} Q${f(c1x)} ${f(c1y)} ${f(tx + j())} ${f(ty + 14 * scale)}"/>`);

  // Hojas: pares estrechos y largos, como las del clavel
  const pairs = 1 + Math.floor(r() * 2);
  for (let p = 0; p < pairs; p += 1) {
    const t = 0.35 + p * 0.22 + r() * 0.08;
    const px = x + (tx - x) * t * t + (c1x - x) * 2 * t * (1 - t) * 0.5;
    const py = base - height * t;
    for (const side of [-1, 1]) {
      const len = (34 + r() * 26) * scale;
      const ex = px + side * len * 0.75 + j(3);
      const ey = py - len * 0.55 + j(3);
      const mx = px + side * len * 0.35;
      parts.push(`<path class="l" d="M${f(px)} ${f(py)} Q${f(mx)} ${f(py - len * 0.05)} ${f(ex)} ${f(ey)}"/>`);
    }
  }

  // Cáliz: copa alargada bajo la flor
  const cw = 5.5 * scale;
  const ch = 16 * scale;
  const cy = ty + 14 * scale;
  parts.push(`<path class="s" d="M${f(tx - cw * 0.55)} ${f(cy)} L${f(tx - cw + j(0.6))} ${f(cy - ch)} M${f(tx + cw * 0.55)} ${f(cy)} L${f(tx + cw + j(0.6))} ${f(cy - ch)}"/>`);

  const top = cy - ch;
  if (bud) {
    // Capullo: gota cerrada con una punta de color
    const bh = 14 * scale;
    parts.push(`<path class="h" d="M${f(tx - cw)} ${f(top)} Q${f(tx - cw * 0.9)} ${f(top - bh)} ${f(tx + j(0.8))} ${f(top - bh * 1.15)} Q${f(tx + cw * 0.9)} ${f(top - bh)} ${f(tx + cw)} ${f(top)}"/>`);
    return parts.join('');
  }

  // Corola: cúpula de borde dentado (los pétalos rizados del clavel) y dos rizos interiores
  const rad = (17 + r() * 7) * scale;
  const teeth = 15 + Math.floor(r() * 5);
  const pts = [];
  for (let i = 0; i <= teeth; i += 1) {
    const a = Math.PI * (1.08 - (i / teeth) * 1.16);
    const rr = rad * (i % 2 ? 0.8 : 1) + j(1.4);
    pts.push([tx + Math.cos(a) * rr * 1.15, top - Math.sin(a) * rr * 1.25]);
  }
  const outline = `M${f(tx - cw)} ${f(top)} L${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join(' L')} L${f(tx + cw)} ${f(top)} Z`;
  // Mancha de color desplazada, como acuarela sobre el dibujo
  parts.push(`<path class="w" d="${outline}" transform="translate(${f(j(4))} ${f(j(3))})"/>`);
  parts.push(`<path class="h" d="${outline}"/>`);
  for (let k = 1; k <= 2; k += 1) {
    const ir = rad * (0.62 - k * 0.18);
    const iy = top - rad * (0.42 + k * 0.2);
    parts.push(`<path class="h" d="M${f(tx - ir)} ${f(iy + ir * 0.3)} q${f(ir * 0.25)} ${f(-ir * 0.5)} ${f(ir * 0.5)} ${f(-ir * 0.1)} q${f(ir * 0.25)} ${f(-ir * 0.55)} ${f(ir * 0.5)} ${f(-ir * 0.05)} q${f(ir * 0.25)} ${f(-ir * 0.45)} ${f(ir * 0.5)} ${f(ir * 0.2)}"/>`);
  }
  return parts.join('');
}

function layer({ seed, count, scaleMin, scaleMax, heightMin, heightMax, buds, edgeBias }) {
  const r = rng(seed);
  const items = [];
  let tries = 0;
  while (items.length < count && tries < count * 20) {
    tries += 1;
    const x = r() * W;
    // Más densidad en los laterales: el centro, donde va el texto, queda más despejado
    const fromCenter = Math.abs(x - W / 2) / (W / 2);
    if (r() > edgeBias + (1 - edgeBias) * fromCenter ** 0.8) continue;
    const scale = scaleMin + r() * (scaleMax - scaleMin);
    items.push({ x, base: H + 20, height: (heightMin + r() * (heightMax - heightMin)) * (0.7 + scale * 0.3), scale, bud: r() < buds });
  }
  items.sort((a, b) => a.scale - b.scale); // los pequeños detrás
  // Hierba baja: trazos cortos sueltos a ras de suelo
  const grass = [];
  for (let i = 0; i < count * 1.5; i += 1) {
    const gx = r() * W;
    const gh = (10 + r() * 22) * scaleMax;
    grass.push(`<path class="l" d="M${f(gx)} ${H + 4} q${f((r() - 0.5) * 8)} ${f(-gh * 0.6)} ${f((r() - 0.5) * 14)} ${f(-gh)}"/>`);
  }
  return grass.join('') + items.map(item => carnation(r, item)).join('');
}

const style = (stroke, flower, wash) => `<style>
  path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .s { stroke: ${stroke}; stroke-width: 1.4; }
  .l { stroke: ${stroke}; stroke-width: 1.2; }
  .h { stroke: ${flower}; stroke-width: 1.3; }
  .w { fill: ${wash}; stroke: none; }
</style>`;

const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${body}</svg>\n`;

mkdirSync('public/img', { recursive: true });
writeFileSync('public/img/campo-claveles-fondo.svg', svg(style('#8aa08b', '#c9a1a2', '#efd9d6') + layer({ seed: 7, count: 70, scaleMin: 0.45, scaleMax: 0.7, heightMin: 150, heightMax: 330, buds: 0.25, edgeBias: 0.35 })));
writeFileSync('public/img/campo-claveles-frente.svg', svg(style('#6f8a72', '#b98385', '#ecc9c6') + layer({ seed: 21, count: 26, scaleMin: 0.9, scaleMax: 1.35, heightMin: 120, heightMax: 300, buds: 0.2, edgeBias: 0.15 })));
console.log('Fondo generado: public/img/campo-claveles-fondo.svg y campo-claveles-frente.svg');
