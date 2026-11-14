// Mapas de las ciudades de Vigo y Ourense, dibujados en el estilo de la web, a partir de datos de
// OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL) guardados y simplificados en scripts/map-data/.
// Uso: node scripts/generate-maps.mjs → public/img/mapa-vigo.svg, public/img/mapa-ourense.svg y public/data/mapas.json
// Las floristerías se colocan encima en el navegador (public/map.js) con los límites de mapas.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const W = 800;
const f = n => n.toFixed(1);

const maps = {
  vigo: {
    title: 'Vigo',
    bbox: { south: 42.196, west: -8.79, north: 42.258, east: -8.675 },
    places: ['Bouzas', 'Balaídos', 'O Berbés', 'Teis', 'Coia', 'Navia', 'O Calvario', 'Castrelos', 'Lavadores', 'Alcabre', 'Os Catro Camiños', 'O Castro', 'Freixeiro', 'Sárdoma', 'Casablanca'],
    seaLabel: { text: 'Ría de Vigo', lat: 42.252, lon: -8.745 },
  },
  ourense: {
    title: 'Ourense',
    bbox: { south: 42.322, west: -7.9, north: 42.36, east: -7.83 },
    places: ['Casco Vello', 'O Couto', 'A Ponte', 'San Francisco', 'Mariñamansa', 'O Vinteún', 'As Lagoas', 'O Posío', 'Barrocás', 'A Carballeira', 'Vista Fermosa', 'San Rosendo'],
  },
};

function setup(bbox) {
  const lat0 = ((bbox.north + bbox.south) / 2) * Math.PI / 180;
  const spanX = (bbox.east - bbox.west) * Math.cos(lat0);
  const spanY = bbox.north - bbox.south;
  const H = Math.round((W * spanY) / spanX);
  const project = ([lat, lon]) => [((lon - bbox.west) / (bbox.east - bbox.west)) * W, ((bbox.north - lat) / spanY) * H];
  return { H, project };
}

const path = (points, project, close = false) => `M${points.map(p => project(p).map(f).join(' ')).join(' L')}${close ? ' Z' : ''}`;

// ----- Costa: une los tramos de OSM, los recorta al recuadro y cierra el agua por el borde -----
const key = p => `${p[0]},${p[1]}`;
function chains(ways) {
  const list = ways.map(w => [...w]);
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < list.length && !merged; i += 1) {
      for (let j = 0; j < list.length && !merged; j += 1) {
        if (i !== j && key(list[i].at(-1)) === key(list[j][0])) {
          list[i] = [...list[i], ...list[j].slice(1)];
          list.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  return list;
}
const inside = ([lat, lon], b) => lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;
function intersect(a, c, b) {
  // Punto donde el segmento a→c cruza el borde del recuadro (a dentro, c fuera o al revés)
  let lo = 0; let hi = 1;
  for (let k = 0; k < 40; k += 1) {
    const m = (lo + hi) / 2;
    const p = [a[0] + (c[0] - a[0]) * m, a[1] + (c[1] - a[1]) * m];
    if (inside(p, b) === inside(a, b)) lo = m; else hi = m;
  }
  return [a[0] + (c[0] - a[0]) * hi, a[1] + (c[1] - a[1]) * hi];
}
function clip(chain, b) {
  const pieces = [];
  let current = null;
  for (let i = 0; i < chain.length; i += 1) {
    const p = chain[i];
    const isIn = inside(p, b);
    if (isIn && !current) current = i === 0 ? [p] : [intersect(p, chain[i - 1], b), p];
    else if (isIn) current.push(p);
    else if (current) { current.push(intersect(chain[i - 1], p, b)); pieces.push(current); current = null; }
  }
  if (current) pieces.push(current);
  return pieces;
}
// Posición sobre el perímetro en sentido horario (norte hacia arriba): N (O→E), E (N→S), S (E→O), O (S→N)
function perimeter(p, b) {
  const [lat, lon] = p;
  const e = 1e-9;
  if (Math.abs(lat - b.north) < e) return (lon - b.west) / (b.east - b.west);
  if (Math.abs(lon - b.east) < e) return 1 + (b.north - lat) / (b.north - b.south);
  if (Math.abs(lat - b.south) < e) return 2 + (b.east - lon) / (b.east - b.west);
  return 3 + (lat - b.south) / (b.north - b.south);
}
/**
 * Zonas de agua: en OSM la tierra queda a la izquierda de la costa y el agua a la derecha.
 * Se recorre cada tramo recortado y, al salir del recuadro, se sigue el borde en sentido horario
 * hasta la siguiente entrada de costa; así se cierran los anillos de agua aunque la costa
 * entre y salga varias veces (espigones del puerto).
 */
function waterRings(pieces, b) {
  const corners = [[b.north, b.east, 1], [b.south, b.east, 2], [b.south, b.west, 3], [b.north, b.west, 4]];
  const tIn = pieces.map(p => perimeter(p[0], b));
  const tOut = pieces.map(p => perimeter(p.at(-1), b));
  const used = new Set();
  const rings = [];
  for (let start = 0; start < pieces.length; start += 1) {
    if (used.has(start)) continue;
    const ring = [];
    let cur = start;
    for (let guard = 0; guard <= pieces.length; guard += 1) {
      used.add(cur);
      ring.push(...pieces[cur]);
      // Siguiente entrada en sentido horario desde la salida actual
      let next = -1;
      let best = Infinity;
      for (let k = 0; k < pieces.length; k += 1) {
        const d = (tIn[k] - tOut[cur] + 4) % 4 || 4;
        if (d < best && (!used.has(k) || k === start)) { best = d; next = k; }
      }
      const from = tOut[cur];
      const to = from + best;
      for (const [lat, lon, t] of [...corners, ...corners.map(([la, lo, t]) => [la, lo, t + 4])]) if (t > from && t < to) ring.push([lat, lon]);
      if (next === start || next === -1) break;
      cur = next;
    }
    rings.push(ring);
  }
  return rings;
}

const style = `<style>
  .land { fill: #f6f5ef; }
  .sea { fill: #dde8e4; }
  .coast { fill: none; stroke: #6f8a72; stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; }
  .road { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .road.minor { stroke: #dfe2d8; stroke-width: 1.3; }
  .road.major { stroke: #cfd5c8; stroke-width: 2.6; }
  .river { fill: none; stroke: #b9d0cf; stroke-linecap: round; stroke-linejoin: round; }
  .river-edge { fill: none; stroke: #8fb0b5; stroke-linecap: round; stroke-linejoin: round; }
  .place { font-family: Georgia, 'Times New Roman', serif; font-style: italic; fill: #7d8b80; font-size: 13px; letter-spacing: .5px; paint-order: stroke; stroke: #f6f5ef; stroke-width: 4px; stroke-linejoin: round; }
  .sea-label { font-family: Georgia, 'Times New Roman', serif; font-style: italic; fill: #6f8f8a; font-size: 18px; letter-spacing: 4px; }
  .river-label { font-family: Georgia, 'Times New Roman', serif; font-style: italic; fill: #6f9499; font-size: 15px; letter-spacing: 2px; paint-order: stroke; stroke: #f6f5ef; stroke-width: 4px; }
  .compass path { fill: none; stroke: #6f8a72; stroke-width: 1.3; }
  .compass .fill { fill: #b98385; stroke: none; }
  .compass text { font-family: Georgia, serif; fill: #6f8a72; font-size: 13px; }
</style>`;
const compass = (x, y) => `<g class="compass" transform="translate(${x} ${y})"><path d="M0 -20 L5 0 L0 20 L-5 0 Z"/><path class="fill" d="M0 -20 L5 0 L-5 0 Z"/><text y="-26" text-anchor="middle">N</text></g>`;

const meta = {};
for (const [name, cfg] of Object.entries(maps)) {
  const data = JSON.parse(readFileSync(`scripts/map-data/${name}.json`, 'utf8'));
  const b = cfg.bbox;
  const { H, project } = setup(b);
  const parts = [`<rect class="land" width="${W}" height="${H}"/>`];

  // Agua del mar: rectángulo recortado por el lado «agua» de cada tramo de costa
  const coastChains = chains(data.water.filter(w => w.k === 'coast').map(w => w.p));
  const pieces = coastChains.filter(c => key(c[0]) !== key(c.at(-1))).flatMap(c => clip(c, b)).filter(p => p.length > 1);
  const islands = coastChains.filter(c => key(c[0]) === key(c.at(-1)) && c.some(p => inside(p, b)));
  if (pieces.length) {
    parts.push(...waterRings(pieces, b).map(ring => `<path class="sea" d="${path(ring, project, true)}"/>`));
    parts.push(...islands.map(ring => `<path class="land" d="${path(ring, project, true)}"/>`));
  }

  // Calles principales
  for (const kind of ['minor', 'major']) {
    parts.push(`<g class="road ${kind}">${data.roads.filter(r => r.k === kind).map(r => `<path d="${path(r.p, project)}"/>`).join('')}</g>`);
  }

  // Ríos: el Miño ancho, el resto finos
  for (const river of data.water.filter(w => w.k !== 'coast')) {
    const wide = /miño/i.test(river.n);
    const d = path(river.p, project);
    parts.push(`<path class="river-edge" stroke-width="${wide ? 15 : 5}" d="${d}"/><path class="river" stroke-width="${wide ? 12 : 3}" d="${d}"/>`);
  }

  // Línea de costa encima de todo
  parts.push(...[...pieces, ...islands].map(p => `<path class="coast" d="${path(p, project)}"/>`));

  // Barrios
  const seen = new Set();
  for (const place of data.places) {
    if (!cfg.places.includes(place.n) || seen.has(place.n) || !inside([place.lat, place.lon], b)) continue;
    seen.add(place.n);
    const [x, y] = project([place.lat, place.lon]);
    parts.push(`<text class="place" x="${f(x)}" y="${f(y)}" text-anchor="middle">${place.n}</text>`);
  }
  if (cfg.seaLabel) {
    const [x, y] = project([cfg.seaLabel.lat, cfg.seaLabel.lon]);
    parts.push(`<text class="sea-label" x="${f(x)}" y="${f(y)}" text-anchor="middle">${cfg.seaLabel.text}</text>`);
  }
  if (name === 'ourense') {
    const [x, y] = project([42.3552, -7.8905]);
    parts.push(`<text class="river-label" x="${f(x)}" y="${f(y)}" transform="rotate(14 ${f(x)} ${f(y)})">río Miño</text>`);
  }
  parts.push(compass(W - 40, 50));

  mkdirSync('public/img', { recursive: true });
  writeFileSync(`public/img/mapa-${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${style}${parts.join('')}</svg>\n`);
  meta[name] = { ...b, ancho: W, alto: H };
}
mkdirSync('public/data', { recursive: true });
writeFileSync('public/data/mapas.json', `${JSON.stringify(meta, null, 2)}\n`);
console.log('Mapas generados:', Object.entries(meta).map(([n, m]) => `${n} ${m.ancho}×${m.alto}`).join(', '));
