// Coloca sobre los mapas de Vigo y Ourense las floristerías de data/floristerias.json.
// Las rutas se resuelven respecto a este archivo, así funciona igual en el servidor local y en GitHub Pages.
const base = new URL('.', import.meta.url);
const lang = document.documentElement.lang === 'gl' ? 'gl' : 'es';
const text = {
  es: { count: n => `${n} floristería${n === 1 ? '' : 's'} en esta zona` },
  gl: { count: n => `${n} floraría${n === 1 ? '' : 's'} nesta zona` },
}[lang];

/**
 * Separa los marcadores que se solapan (dos floristerías en la misma plaza): los empuja lo justo
 * para que se lean todos, partiendo siempre de su posición real. Se recalcula al cambiar el tamaño.
 */
function spread(figure) {
  const canvas = figure.querySelector('.map-canvas').getBoundingClientRect();
  if (!canvas.width) return;
  const markers = [...figure.querySelectorAll('.map-marker')];
  const pts = markers.map(m => ({ x: (m.dataset.x / 100) * canvas.width, y: (m.dataset.y / 100) * canvas.height }));
  const min = 25;
  for (let round = 0; round < 60; round += 1) {
    let moved = false;
    for (let a = 0; a < pts.length; a += 1) {
      for (let b = a + 1; b < pts.length; b += 1) {
        const dx = pts[b].x - pts[a].x || 0.01 * (b - a);
        const dy = pts[b].y - pts[a].y;
        const dist = Math.hypot(dx, dy);
        if (dist >= min) continue;
        const push = (min - dist) / 2;
        const ux = dx / (dist || 1); const uy = dy / (dist || 1);
        pts[a].x -= ux * push; pts[a].y -= uy * push;
        pts[b].x += ux * push; pts[b].y += uy * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  markers.forEach((m, i) => {
    m.style.left = `${(pts[i].x / canvas.width) * 100}%`;
    m.style.top = `${(pts[i].y / canvas.height) * 100}%`;
  });
}

async function load(name) {
  const res = await fetch(new URL(`data/${name}`, base));
  if (!res.ok) throw new Error(name);
  return res.json();
}

try {
  const [maps, data] = await Promise.all([load('mapas.json'), load('floristerias.json')]);
  for (const figure of document.querySelectorAll('[data-map]')) {
    const zone = figure.dataset.map;
    const bounds = maps[zone];
    const shops = (data.floristerias ?? []).filter(shop => shop.zona === zone && Number.isFinite(shop.lat) && Number.isFinite(shop.lon));
    if (!bounds || !shops.length) continue;
    const layer = figure.querySelector('.map-markers');
    const list = figure.querySelector('.map-list');
    for (const shop of shops) {
      const x = ((shop.lon - bounds.west) / (bounds.east - bounds.west)) * 100;
      const y = ((bounds.north - shop.lat) / (bounds.north - bounds.south)) * 100;
      if (x < 0 || x > 100 || y < 0 || y > 100) continue;
      const marker = document.createElement('span');
      marker.className = 'map-marker';
      marker.textContent = String(list.children.length + 1);
      marker.dataset.x = x;
      marker.dataset.y = y;
      marker.title = `${shop.nombre} · ${shop.localidad}`;
      layer.append(marker);
      const item = document.createElement('li');
      item.textContent = `${shop.nombre} · ${shop.localidad}`;
      list.append(item);
    }
    spread(figure);
    window.addEventListener('resize', () => spread(figure));
    figure.querySelector('.map-empty').hidden = true;
    figure.querySelector('.map-demo').hidden = !data.demo;
    list.hidden = false;
    figure.querySelector('.map-count').textContent = text.count(shops.length);
  }
} catch {
  // Sin datos (por ejemplo, abierto como archivo local): los mapas se muestran sin marcadores.
}
