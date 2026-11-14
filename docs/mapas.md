# Mapas de reparto y floristerías

Los mapas de la sección «Zona de reparto» son ilustraciones esquemáticas (costa, ríos y localidades aproximados), generadas con `node scripts/generate-maps.mjs`. Las localidades que aparecen son una **referencia geográfica**, no una lista de cobertura confirmada.

## Añadir floristerías

Editar `public/data/floristerias.json` **solo con floristerías confirmadas por la propietaria y que hayan aceptado aparecer** en la web:

```json
{
  "floristerias": [
    { "nombre": "Nombre comercial", "localidad": "Vigo", "zona": "vigo", "lat": 42.2406, "lon": -8.7207 }
  ]
}
```

- `zona`: `vigo` u `ourense`.
- `lat` y `lon`: coordenadas en grados decimales (por ejemplo, desde Google Maps: clic derecho sobre el local → copiar coordenadas).
- No hace falta tocar el HTML: `public/map.js` coloca los marcadores y la lista accesible bajo cada mapa. Si la lista está vacía, el mapa muestra «Próximamente».
- Los límites de cada mapa están en `public/data/mapas.json`; una floristería fuera de ellos no se dibuja.
