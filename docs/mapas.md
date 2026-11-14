# Mapas de reparto y floristerías

Los mapas de la sección «Zona de reparto» muestran las ciudades de Vigo y Ourense dibujadas en el estilo de la web, a partir de datos de **OpenStreetMap** (© colaboradores de OpenStreetMap, licencia ODbL; la atribución figura bajo los mapas). Los datos simplificados (costa, ríos, calles principales y barrios) están en `scripts/map-data/` y los SVG se regeneran con `npm run maps`.

## Estado actual: datos de demostración

`public/data/floristerias.json` contiene **15 floristerías reales** (7 de Vigo, 8 de Ourense) presentadas como clientes **solo para la demo a la propietaria**, a petición del usuario (14/11/2026). Proceden de OpenStreetMap (Vigo y Jomacos) y de los directorios Páxinas Galegas y Bodas.net (Ourense, situadas por su calle con Nominatim). **No está confirmado que se trabaje con ellas ni que hayan dado permiso.** El archivo lleva `"demo": true`, que muestra «Datos de demostración» bajo cada mapa.

**Antes de publicar de verdad:** sustituir la lista por las floristerías que indique la propietaria, con su permiso, y quitar `"demo": true`.

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
