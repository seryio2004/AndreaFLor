// Coloca sobre los mapas de Vigo y Ourense las floristerías de data/floristerias.json.
// Las rutas se resuelven respecto a este archivo, así funciona igual en el servidor local y en GitHub Pages.
const base = new URL('.', import.meta.url);
const lang = document.documentElement.lang === 'gl' ? 'gl' : 'es';
const text = {
  es: { count: n => `${n} floristería${n === 1 ? '' : 's'} en esta zona` },
  gl: { count: n => `${n} floraría${n === 1 ? '' : 's'} nesta zona` },
}[lang];

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
      marker.style.left = `${x}%`;
      marker.style.top = `${y}%`;
      marker.title = `${shop.nombre} · ${shop.localidad}`;
      layer.append(marker);
      const item = document.createElement('li');
      item.textContent = `${shop.nombre} · ${shop.localidad}`;
      list.append(item);
    }
    figure.querySelector('.map-empty').hidden = true;
    list.hidden = false;
    figure.querySelector('.map-count').textContent = text.count(shops.length);
  }
} catch {
  // Sin datos (por ejemplo, abierto como archivo local): los mapas se muestran sin marcadores.
}
