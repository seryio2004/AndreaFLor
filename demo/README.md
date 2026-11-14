# Demostración visual del panel (Stageshow)

Animación **simulada** de una acción del panel comercial: un contacto pasa de «Nuevo» a «Interesado» y se programa su seguimiento. Usa datos ficticios, no llama a la API ni toca la base de datos, y no forma parte del CRM. No se enlaza desde la landing para floristerías.

## Uso

```bash
cd demo
npm install --ignore-scripts
npm run dev          # http://127.0.0.1:5180  (?capture=seguimiento para filmar, ?capture=gold el ejemplo original)
npm run build        # compila a ../public/demo → http://127.0.0.1:3000/demo/ con el servidor principal
npm run typecheck
```

Verificación con las herramientas de Stageshow (necesitan Chrome o Chromium; `CHROME_PATH` si no es Google Chrome):

```bash
CHROME_PATH=/ruta/a/chromium npm run film -- "http://127.0.0.1:5180/?capture=seguimiento" --select '#example' --gate
CHROME_PATH=/ruta/a/chromium npm run film -- "http://127.0.0.1:5180/?capture=seguimiento" --select '#example' --width 390 --gate
CHROME_PATH=/ruta/a/chromium npm run film -- "http://127.0.0.1:5180/?capture=seguimiento" --select '#example' --states --gate
```

Resultado de la última verificación: `src/scenes/seguimiento/REHEARSAL.md`.

## Procedencia de los archivos incorporados

Fuente: https://github.com/benjitaylor/skills/tree/main/stageshow — commit `299140fafd08df55a9c234e610c3f64af3f45531` (4/11/2026), versión de la skill 1.1.1. Licencia MIT (Benji Taylor), copia en `vendor/stageshow/LICENSE`; avisos de terceros en `vendor/stageshow/NOTICE.md`.

| Ruta en este proyecto | Origen | Cambios |
|---|---|---|
| `vendor/stageshow/kit/` | `stageshow/kit/` | Eliminados `kit/brands/` (logotipos de terceros con licencias propias) y `parts/BrandMark.*`; quitadas sus exportaciones de `index.ts` y `parts/index.ts` y su `@import` de `stageshow.css`. Nada más. |
| `vendor/stageshow/scripts/` | `stageshow/scripts/` | Sin cambios (rodaje y comprobaciones; no se usan en ejecución). |
| `src/scenes/gold-table-edit/` | `stageshow/examples/table-edit/` | Solo la ruta de importación del kit. Referencia de calidad; solo se carga en desarrollo (`?capture=gold`) y no entra en la compilación. |
| `src/scenes/seguimiento/` | Escena propia, partiendo de `examples/table-edit` (estructura) y `examples/share` (menú anclado) | — |

No se ha ejecutado ningún instalador remoto de la skill; `npm install` se ejecuta con `--ignore-scripts`. No se incluyen fuentes, fotografías ni iconos de aplicaciones de terceros. Los iconos usados son de `lucide-react` (ISC).
