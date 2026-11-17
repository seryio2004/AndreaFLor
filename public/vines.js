// Enredaderas del fondo: tallos que trepan desde el suelo con hojas, zarcillos y flores
// (clavel, margarita y rosa) dibujados a trazo, con el mismo estilo que el campo de claveles.
// Se generan en el navegador a la medida de la pantalla (semilla fija, mismo dibujo en cada visita)
// y crecen con el scroll: al principio solo asoman por los laterales y al llegar al final
// cubren casi toda la pantalla. Decorativo: aria-hidden y sin eventos de puntero.
const NS = 'http://www.w3.org/2000/svg';
const f = n => n.toFixed(1);

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

// Curva suave que pasa por todos los puntos (Catmull-Rom convertida a Bézier cúbica)
function smooth(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// --- Flores. Origen (0,0) = punto donde la flor se une a su pedúnculo; la flor crece hacia arriba (y negativa).

function carnation(r, s) {
  const j = a => (r() - 0.5) * 2 * a * s;
  const cw = 5.5 * s;
  const ch = 16 * s;
  const parts = [`<path class="s" d="M${f(-cw * 0.55)} 0 L${f(-cw + j(0.6))} ${f(-ch)} M${f(cw * 0.55)} 0 L${f(cw + j(0.6))} ${f(-ch)}"/>`];
  const top = -ch;
  const rad = (16 + r() * 6) * s;
  const teeth = 15 + Math.floor(r() * 5);
  const pts = [];
  for (let i = 0; i <= teeth; i += 1) {
    const a = Math.PI * (1.08 - (i / teeth) * 1.16);
    const rr = rad * (i % 2 ? 0.8 : 1) + j(1.4);
    pts.push(`${f(Math.cos(a) * rr * 1.15)} ${f(top - Math.sin(a) * rr * 1.25)}`);
  }
  const outline = `M${f(-cw)} ${f(top)} L${pts.join(' L')} L${f(cw)} ${f(top)} Z`;
  parts.push(`<path class="w" d="${outline}" transform="translate(${f(j(4))} ${f(j(3))})"/>`, `<path class="h" d="${outline}"/>`);
  for (let k = 1; k <= 2; k += 1) {
    const ir = rad * (0.62 - k * 0.18);
    const iy = top - rad * (0.42 + k * 0.2);
    parts.push(`<path class="h" d="M${f(-ir)} ${f(iy + ir * 0.3)} q${f(ir * 0.25)} ${f(-ir * 0.5)} ${f(ir * 0.5)} ${f(-ir * 0.1)} q${f(ir * 0.25)} ${f(-ir * 0.55)} ${f(ir * 0.5)} ${f(-ir * 0.05)} q${f(ir * 0.25)} ${f(-ir * 0.45)} ${f(ir * 0.5)} ${f(ir * 0.2)}"/>`);
  }
  return parts.join('');
}

function daisy(r, s) {
  const j = a => (r() - 0.5) * 2 * a * s;
  const R = (17 + r() * 6) * s;
  const rc = R * 0.3;
  const cy = -R * 0.85;
  const n = 13 + Math.floor(r() * 5);
  const rot = r() * Math.PI;
  const petals = [];
  for (let k = 0; k < n; k += 1) {
    const a = rot + (k / n) * Math.PI * 2 + j(0.04);
    const dx = Math.cos(a);
    const dy = Math.sin(a) * 0.82; // ligeramente de perfil
    const len = R * (0.88 + r() * 0.2);
    const w = R * 0.16;
    const bx = dx * rc * 0.8;
    const by = cy + dy * rc * 0.8;
    const tx = dx * len + j(1);
    const ty = cy + dy * len + j(1);
    const mx = dx * len * 0.6;
    const my = cy + dy * len * 0.6;
    petals.push(`M${f(bx)} ${f(by)} Q${f(mx - dy * w)} ${f(my + dx * w)} ${f(tx)} ${f(ty)} Q${f(mx + dy * w)} ${f(my - dx * w)} ${f(bx)} ${f(by)}`);
  }
  const d = petals.join(' ');
  const circle = `M${f(-rc)} ${f(cy)} a${f(rc)} ${f(rc * 0.9)} 0 1 0 ${f(rc * 2)} 0 a${f(rc)} ${f(rc * 0.9)} 0 1 0 ${f(-rc * 2)} 0`;
  return `<path class="s" d="M0 0 L${f(j(1))} ${f(cy + rc)}"/>`
    + `<path class="dw" d="${d}" transform="translate(${f(j(3))} ${f(j(2))})"/><path class="dh" d="${d}"/>`
    + `<path class="cw" d="${circle}"/><path class="ch" d="${circle}"/>`;
}

function rose(r, s) {
  const j = a => (r() - 0.5) * 2 * a * s;
  const R = (14 + r() * 5) * s;
  const cy = -R * 1.05;
  const P = (x, y) => `${f(x * R)} ${f(cy + y * R)}`;
  const parts = [];
  // Sépalos bajo la flor
  parts.push(`<path class="s" d="M0 0 Q${P(-0.5, 0.95)} ${P(-0.85, 0.75)} M0 0 Q${P(0.5, 0.95)} ${P(0.85, 0.75)}"/>`);
  // Mancha de color
  const blob = `M${P(-1, -0.05)} Q${P(-1.05, -0.95)} ${P(0, -1)} Q${P(1.05, -0.95)} ${P(1, -0.05)} Q${P(0.95, 0.85)} ${P(0, 0.9)} Q${P(-0.95, 0.85)} ${P(-1, -0.05)} Z`;
  parts.push(`<path class="rw" d="${blob}" transform="translate(${f(j(4))} ${f(j(3))})"/>`);
  // Pétalos exteriores: copa inferior, dos laterales y el borde superior
  parts.push(`<path class="rh" d="M${P(-0.92, 0.05)} Q${P(0, 1.25)} ${P(0.92, 0.05)}"/>`);
  parts.push(`<path class="rh" d="M${P(-0.15, 0.92)} C${P(-1.15, 0.85)} ${P(-1.2, -0.25)} ${P(-0.5, -0.7)}"/>`);
  parts.push(`<path class="rh" d="M${P(0.15, 0.92)} C${P(1.15, 0.85)} ${P(1.2, -0.25)} ${P(0.5, -0.7)}"/>`);
  parts.push(`<path class="rh" d="M${P(-0.7, -0.4)} Q${P(0, -1.1)} ${P(0.72, -0.42)}"/>`);
  // Espiral interior
  const sp = [];
  const turns = 2.6 + r() * 0.6;
  const start = r() * Math.PI * 2;
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const a = start + t * turns * Math.PI * 2;
    const rr = 0.62 * (1 - t * 0.85);
    sp.push([Math.cos(a) * rr * R, cy - 0.08 * R + Math.sin(a) * rr * R * 0.8]);
  }
  parts.push(`<path class="rh" d="${smooth(sp)}"/>`);
  return parts.join('');
}

const FLOWERS = [carnation, daisy, rose];

// --- Una enredadera: tallo serpenteante, nudos con hojas, zarcillos y flores.
function vine(r, { x, base, height, scale, W }) {
  const amp = (14 + r() * 26) * scale;
  const freq = 1.1 + r() * 1.3;
  const phase = r() * Math.PI * 2;
  const drift = (r() - 0.5) * height * 0.25 + (x < W / 2 ? 1 : -1) * r() * height * 0.08;
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i += 1) {
    const t = i / N;
    pts.push([x + Math.sin(phase + t * freq * Math.PI * 2) * amp * (0.35 + 0.65 * t) + drift * t * t, base - height * t]);
  }
  const items = [];
  const step = 3 + Math.floor(r() * 2);
  let side = r() < 0.5 ? -1 : 1;
  for (let i = 4; i < N; i += step) {
    const [px, py] = pts[i];
    const [ax, ay] = pts[i - 1];
    const [bx, by] = pts[i + 1];
    const ta = Math.atan2(by - ay, bx - ax); // dirección del tallo (hacia arriba)
    const t = i / N;
    const roll = r();
    side = -side;
    if (roll < 0.34) items.push({ t, svg: flowerOn(r, px, py, ta, side, scale) });
    else if (roll < 0.46) items.push({ t, svg: tendril(r, px, py, ta, side, scale) });
    items.push({ t: t + 0.01, svg: leaf(r, px, py, ta, -side, scale * (0.8 + r() * 0.4)) });
  }
  // Remate: una flor en la punta
  const [ex, ey] = pts[N];
  const [qx, qy] = pts[N - 1];
  const kind = FLOWERS[Math.floor(r() * FLOWERS.length)];
  const tilt = (Math.atan2(ey - qy, ex - qx) + Math.PI / 2) * 57.3;
  items.push({ t: 0.995, svg: `<g transform="translate(${f(ex)} ${f(ey)}) rotate(${f(tilt)})"><g class="it">${kind(r, scale * 1.1)}</g></g>` });
  items.sort((a, b) => a.t - b.t);
  return { d: smooth(pts), items };
}

function leaf(r, px, py, ta, side, s) {
  const a = ta + side * (0.7 + r() * 0.5);
  const L = (18 + r() * 14) * s;
  const tx = px + Math.cos(a) * L;
  const ty = py + Math.sin(a) * L;
  const mx = (px + tx) / 2;
  const my = (py + ty) / 2;
  const w = L * 0.3;
  const nx = -Math.sin(a) * w;
  const ny = Math.cos(a) * w;
  const d = `M${f(px)} ${f(py)} Q${f(mx + nx)} ${f(my + ny)} ${f(tx)} ${f(ty)} Q${f(mx - nx)} ${f(my - ny)} ${f(px)} ${f(py)}`;
  return `<g class="it"><path class="lw" d="${d}"/><path class="l" d="${d} M${f(px)} ${f(py)} L${f(px + (tx - px) * 0.75)} ${f(py + (ty - py) * 0.75)}"/></g>`;
}

function tendril(r, px, py, ta, side, s) {
  const a0 = ta + side * 0.9;
  const pts = [[px, py]];
  let x = px;
  let y = py;
  let a = a0;
  let len = 5 * s;
  for (let i = 0; i < 16; i += 1) {
    a += side * (0.25 + i * 0.03);
    len *= 0.93;
    x += Math.cos(a) * len;
    y += Math.sin(a) * len;
    pts.push([x, y]);
  }
  return `<g class="it"><path class="l" d="${smooth(pts)}"/></g>`;
}

function flowerOn(r, px, py, ta, side, s) {
  const a = ta + side * (0.55 + r() * 0.35);
  const L = (12 + r() * 14) * s;
  const ex = px + Math.cos(a) * L;
  const ey = py + Math.sin(a) * L;
  const cx = px + Math.cos(a - side * 0.4) * L * 0.6;
  const cy = py + Math.sin(a - side * 0.4) * L * 0.6;
  const kind = FLOWERS[Math.floor(r() * FLOWERS.length)];
  const tilt = (a + Math.PI / 2) * 57.3 * 0.55;
  const fs = s * (0.7 + r() * 0.35);
  return `<g class="it"><path class="s" d="M${f(px)} ${f(py)} Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)}"/></g>`
    + `<g transform="translate(${f(ex)} ${f(ey)}) rotate(${f(tilt)})"><g class="it">${kind(r, fs)}</g></g>`;
}

// --- Montaje y control con el scroll
export function createVines(container) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'field-vines');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
  container.insertBefore(svg, container.querySelector('.field-front'));

  let vines = [];
  let builtWidth = 0;

  function build() {
    const W = Math.max(320, window.innerWidth);
    const H = Math.max(480, window.innerHeight);
    builtWidth = window.innerWidth;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const r = rng(2026);
    // En móvil el fondo gana protagonismo: más tallos, flores algo mayores y crecimiento más temprano
    const narrow = W < 700;
    const unit = narrow ? 0.9 : Math.min(1.25, Math.max(0.7, W / 1100));
    const count = narrow ? Math.round(Math.max(20, W / 18)) : Math.round(Math.min(32, Math.max(15, W / 48)));
    const reach = narrow ? 0.5 : 0.72;
    const head = narrow ? -0.4 : -0.12; // en móvil ya hay tallos crecidos desde el principio
    const specs = [];
    for (let i = 0; i < count; i += 1) {
      // Repartidas a lo ancho con algo de azar; la «centralidad» decide cuándo empiezan a crecer
      const x = ((i + 0.15 + r() * 0.7) / count) * W;
      const centrality = 1 - Math.abs(x - W / 2) / (W / 2);
      const scale = unit * (0.75 + r() * 0.45);
      const height = H * (0.92 - centrality * 0.3 - r() * 0.14);
      const start = head + Math.pow(centrality, 1.3) * reach + (r() - 0.5) * 0.1;
      const span = 0.24 + r() * 0.16;
      specs.push({ x, scale, height, start, span, depth: r() });
    }
    specs.sort((a, b) => a.depth - b.depth); // las más lejanas, detrás
    let html = '';
    for (const spec of specs) {
      const v = vine(r, { x: spec.x, base: H + 6, height: spec.height, scale: spec.scale, W });
      spec.items = v.items;
      const back = spec.depth < 0.4 ? ' back' : '';
      html += `<g class="vine${back}"><path class="s stem" pathLength="1" d="${v.d}"/>${v.items.map(item => item.svg).join('')}</g>`;
    }
    svg.innerHTML = html;
    const groups = svg.querySelectorAll('.vine');
    vines = specs.map((spec, i) => {
      const g = groups[i];
      return {
        start: spec.start,
        span: spec.span,
        stem: g.querySelector('.stem'),
        // Cada elemento .it aparece cuando el tallo alcanza su altura
        marks: [...g.querySelectorAll('.it')],
        ts: spec.items.flatMap(item => Array((item.svg.match(/class="it"/g) || []).length).fill(item.t)),
        shown: 0,
        grow: -1,
      };
    });
  }

  function update(progress) {
    if (window.innerWidth !== builtWidth) build();
    for (const v of vines) {
      const grow = Math.max(0, Math.min(1, (progress - v.start) / v.span));
      if (Math.abs(grow - v.grow) < 0.002) continue;
      v.grow = grow;
      v.stem.style.strokeDashoffset = (1 - grow).toFixed(3);
      let n = 0;
      while (n < v.ts.length && v.ts[n] <= grow) n += 1;
      if (n !== v.shown) {
        for (let i = Math.min(n, v.shown); i < Math.max(n, v.shown); i += 1) v.marks[i].classList.toggle('on', i < n);
        v.shown = n;
      }
    }
  }

  build();
  return { update };
}
