// Mapas esquemáticos del área de Vigo y del área de Ourense, dibujados a trazo en el estilo del fondo.
// Costa, ríos y localidades son aproximados (referencia visual, no cartografía).
// Uso: node scripts/generate-maps.mjs → public/img/mapa-vigo.svg, public/img/mapa-ourense.svg y public/data/mapas.json
// Las floristerías se colocan encima en el navegador (public/map.js) a partir de public/data/floristerias.json,
// usando los mismos límites geográficos que se guardan en mapas.json.
import { writeFileSync, mkdirSync } from 'node:fs';

const W = 800;
const H = 600;
const f = n => n.toFixed(1);

let seed = 5;
const r = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const j = (a = 1) => (r() - 0.5) * 2 * a;

function projector(bounds) {
  const { north, south, west, east } = bounds;
  return ([lat, lon]) => [((lon - west) / (east - west)) * W, ((north - lat) / (north - south)) * H];
}

/** Trazo suave a mano alzada que pasa por los puntos (curvas cuadráticas por los puntos medios). */
function smooth(points, close = false, wobble = 1.2) {
  const p = points.map(([x, y]) => [x + j(wobble), y + j(wobble)]);
  if (close) p.push(p[0], p[1]);
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 1; i < p.length - 1; i += 1) {
    const mx = (p[i][0] + p[i + 1][0]) / 2;
    const my = (p[i][1] + p[i + 1][1]) / 2;
    d += ` Q${f(p[i][0])} ${f(p[i][1])} ${f(mx)} ${f(my)}`;
  }
  if (!close) d += ` L${f(p.at(-1)[0])} ${f(p.at(-1)[1])}`;
  return d + (close ? ' Z' : '');
}

function waves(region, count, project) {
  // Ondas cortas sobre el mar
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const [x, y] = project(region());
    if (Number.isNaN(x)) continue;
    const w = 10 + r() * 14;
    out.push(`<path d="M${f(x)} ${f(y)} q${f(w / 4)} -3 ${f(w / 2)} 0 t${f(w / 2)} 0"/>`);
  }
  return out.join('');
}

function town(project, [name, lat, lon, size = 'm', anchor = 'start', dx = 9, dy = 4]) {
  const [x, y] = project([lat, lon]);
  const rad = size === 'l' ? 6.5 : 4;
  const font = size === 'l' ? 26 : 16;
  return `<g class="town${size === 'l' ? ' main' : ''}"><circle cx="${f(x)}" cy="${f(y)}" r="${rad}"/><text x="${f(x + (anchor === 'end' ? -dx : dx))}" y="${f(y + dy)}" text-anchor="${anchor}" font-size="${font}">${name}</text></g>`;
}

function compass(x, y) {
  return `<g class="compass" transform="translate(${x} ${y})"><path d="M0 -22 L5 0 L0 22 L-5 0 Z"/><path class="fill" d="M0 -22 L5 0 L-5 0 Z"/><text y="-28" text-anchor="middle" font-size="13">N</text></g>`;
}

const style = `<style>
  .land { fill: #f6f5ef; }
  .sea { fill: #dde8e4; }
  .coast { fill: none; stroke: #6f8a72; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .wave path { fill: none; stroke: #9db9b3; stroke-width: 1.1; stroke-linecap: round; }
  .river { fill: none; stroke: #8fb0b5; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .river.small { stroke-width: 1.4; }
  .hatch path { fill: none; stroke: #c9d3c3; stroke-width: 1; stroke-linecap: round; }
  .town circle { fill: #f6f5ef; stroke: #203c31; stroke-width: 1.6; }
  .town.main circle { fill: #203c31; }
  .town text { font-family: Georgia, 'Times New Roman', serif; fill: #203c31; paint-order: stroke; stroke: #f6f5ef; stroke-width: 4px; stroke-linejoin: round; }
  .town.main text { font-style: italic; }
  .label { font-family: Georgia, 'Times New Roman', serif; font-style: italic; fill: #6f8f8a; letter-spacing: 3px; }
  .river-label { font-family: Georgia, 'Times New Roman', serif; font-style: italic; fill: #7aa0a6; font-size: 14px; }
  .compass path { fill: none; stroke: #6f8a72; stroke-width: 1.3; }
  .compass .fill { fill: #b98385; stroke: none; }
  .compass text { font-family: Georgia, serif; fill: #6f8a72; }
</style>`;

function hatchLand(project, test, count) {
  // Trazos cortos de relieve sobre tierra firme, muy suaves
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const x = r() * W;
    const y = r() * H;
    if (!test(x, y)) continue;
    const len = 6 + r() * 8;
    out.push(`<path d="M${f(x)} ${f(y)} l${f(len)} ${f(-len * 0.35)}"/>`);
  }
  return `<g class="hatch">${out.join('')}</g>`;
}

// ---------- Área de Vigo ----------
const vigo = { north: 42.37, south: 42.03, west: -8.96, east: -8.48 };
const pv = projector(vigo);
// Costa de sur a norte: Baiona, Nigrán, Samil, Bouzas, Vigo, Chapela, Rande, Redondela, San Simón,
// y de vuelta por la orilla norte: Domaio, Moaña, Cangas, cabo Home y costa hacia Aldán.
const coast = [
  [42.03, -8.885], [42.07, -8.874], [42.1, -8.862], [42.118, -8.85], [42.122, -8.83], [42.13, -8.805], [42.145, -8.812],
  [42.158, -8.842], [42.168, -8.83], [42.182, -8.808], [42.2, -8.79], [42.215, -8.772], [42.229, -8.752], [42.24, -8.732],
  [42.246, -8.712], [42.254, -8.692], [42.266, -8.671], [42.282, -8.657], [42.29, -8.634], [42.285, -8.612], [42.3, -8.6],
  [42.326, -8.607], [42.348, -8.618], [42.338, -8.634], [42.312, -8.642], [42.294, -8.662], [42.29, -8.69], [42.285, -8.72],
  [42.279, -8.745], [42.27, -8.768], [42.262, -8.79], [42.252, -8.818], [42.243, -8.858], [42.256, -8.876], [42.278, -8.872],
  [42.29, -8.84], [42.302, -8.842], [42.32, -8.858], [42.37, -8.866],
].map(pv);
const seaPoly = [...coast, pv([42.37, -8.96]), pv([42.03, -8.96])];
const coastPath = smooth(coast);
// El mar se cierra con la misma línea de costa para que relleno y trazo coincidan
const seaPath = `${coastPath} L${f(W * 0 + pv([42.37, -8.96])[0])} ${f(pv([42.37, -8.96])[1])} L${f(pv([42.03, -8.96])[0])} ${f(pv([42.03, -8.96])[1])} Z`;
const islands = [
  [[42.243, -8.905], [42.236, -8.896], [42.222, -8.899], [42.214, -8.904], [42.226, -8.912], [42.238, -8.911]],
  [[42.205, -8.9], [42.196, -8.895], [42.19, -8.9], [42.198, -8.908]],
].map(points => points.map(pv));
const vigoTowns = [
  ['Vigo', 42.2406, -8.7207, 'l', 'start', 12, 30],
  ['Redondela', 42.2833, -8.6097, 'm', 'start'],
  ['Cangas', 42.2647, -8.7828, 'm', 'end', 9, -6],
  ['Moaña', 42.2839, -8.7425, 'm', 'start', 8, -8],
  ['O Porriño', 42.1611, -8.62],
  ['Mos', 42.1906, -8.6047],
  ['Baiona', 42.1178, -8.8497, 'm', 'end'],
  ['Nigrán', 42.1417, -8.8058],
  ['Gondomar', 42.1117, -8.7614],
  ['Tui', 42.0478, -8.6439],
  ['Ponteareas', 42.1747, -8.5039, 'm', 'end'],
  ['Soutomaior', 42.3344, -8.5667, 'm', 'end'],
];
const inSeaVigo = (x, y) => {
  // punto en polígono (par/impar)
  let inside = false;
  for (let a = 0, b = seaPoly.length - 1; a < seaPoly.length; b = a, a += 1) {
    const [xa, ya] = seaPoly[a]; const [xb, yb] = seaPoly[b];
    if ((ya > y) !== (yb > y) && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
};
const vigoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${style}
<rect class="land" width="${W}" height="${H}"/>
${hatchLand(pv, (x, y) => !inSeaVigo(x, y), 260)}
<path class="sea" d="${seaPath}"/>
${islands.map(points => `<path class="land" d="${smooth(points, true, 0.5)}"/><path class="coast" d="${smooth(points, true, 0.5)}"/>`).join('')}
<g class="wave">${waves(() => [42.04 + r() * 0.3, -8.955 + r() * 0.07], 60, pv)}${waves(() => [42.22 + r() * 0.05, -8.85 + r() * 0.12], 16, pv).split('<path').filter((p, i) => i === 0 || (() => { const m = p.match(/M([\d.]+) ([\d.]+)/); return m && inSeaVigo(+m[1], +m[2]); })()).join('<path')}</g>
<path class="coast" d="${coastPath}"/>
<path class="river small" d="${smooth([[42.05, -8.48], [42.07, -8.55], [42.06, -8.62], [42.04, -8.66]].map(pv))}"/>
<text class="river-label" x="${f(pv([42.065, -8.585])[0])}" y="${f(pv([42.065, -8.585])[1] - 8)}">río Miño</text>
<text class="label" x="${f(pv([42.15, -8.945])[0])}" y="${f(pv([42.15, -8.945])[1])}" font-size="16">Océano Atlántico</text>
<text class="label" x="${f(pv([42.236, -8.815])[0])}" y="${f(pv([42.236, -8.815])[1])}" font-size="13" transform="rotate(-18 ${f(pv([42.236, -8.815])[0])} ${f(pv([42.236, -8.815])[1])})">Ría de Vigo</text>
${vigoTowns.map(t => town(pv, t)).join('')}
${compass(750, 70)}
</svg>
`;

// ---------- Área de Ourense ----------
const ourense = { north: 42.5, south: 41.9, west: -8.25, east: -7.38 };
const po = projector(ourense);
const mino = [[42.47, -7.71], [42.43, -7.76], [42.39, -7.81], [42.355, -7.85], [42.338, -7.872], [42.322, -7.91], [42.31, -7.96], [42.3, -8.02], [42.292, -8.08], [42.285, -8.14], [42.27, -8.2], [42.25, -8.25]].map(po);
const sil = [[42.4, -7.38], [42.42, -7.5], [42.44, -7.62], [42.46, -7.69], [42.47, -7.71]].map(po);
const arnoia = [[42.19, -7.79], [42.2, -7.88], [42.22, -7.96], [42.24, -8.04], [42.26, -8.1], [42.28, -8.12]].map(po);
const limia = [[42.07, -7.72], [42.03, -7.8], [41.99, -7.9], [41.95, -8.0], [41.9, -8.08]].map(po);
const tamega = [[41.99, -7.4], [41.96, -7.43], [41.92, -7.45], [41.9, -7.47]].map(po);
const ourenseTowns = [
  ['Ourense', 42.3358, -7.8639, 'l', 'end', 14, -12],
  ['Barbadás', 42.3008, -7.8869, 'm', 'end'],
  ['O Pereiro de Aguiar', 42.3461, -7.8008, 'm', 'start', 9, 18],
  ['San Cibrao das Viñas', 42.2764, -7.8514],
  ['O Carballiño', 42.4317, -8.0775],
  ['Ribadavia', 42.2875, -8.1428, 'm', 'start', 9, -8],
  ['Allariz', 42.1906, -7.8017],
  ['Maceda', 42.2694, -7.65],
  ['Celanova', 42.1528, -7.9575],
  ['Xinzo de Limia', 42.0636, -7.7247],
  ['Verín', 41.9411, -7.4361, 'm', 'end'],
];
const ourenseSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${style}
<rect class="land" width="${W}" height="${H}"/>
${hatchLand(po, () => true, 340)}
<path class="river" d="${smooth(mino)}"/>
<path class="river" d="${smooth(sil)}"/>
<path class="river small" d="${smooth(arnoia)}"/>
<path class="river small" d="${smooth(limia)}"/>
<path class="river small" d="${smooth(tamega)}"/>
<text class="river-label" x="${f(po([42.305, -8.03])[0])}" y="${f(po([42.305, -8.03])[1] - 10)}">río Miño</text>
<text class="river-label" x="${f(po([42.43, -7.55])[0])}" y="${f(po([42.43, -7.55])[1] - 10)}">río Sil</text>
${ourenseTowns.map(t => town(po, t)).join('')}
${compass(750, 70)}
</svg>
`;

mkdirSync('public/img', { recursive: true });
mkdirSync('public/data', { recursive: true });
writeFileSync('public/img/mapa-vigo.svg', vigoSvg);
writeFileSync('public/img/mapa-ourense.svg', ourenseSvg);
writeFileSync('public/data/mapas.json', `${JSON.stringify({ ancho: W, alto: H, vigo, ourense }, null, 2)}\n`);
console.log('Mapas generados: public/img/mapa-vigo.svg, public/img/mapa-ourense.svg, public/data/mapas.json');
