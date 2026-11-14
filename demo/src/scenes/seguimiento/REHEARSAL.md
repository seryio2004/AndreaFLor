# Rehearsal: seguimiento (demostración del panel comercial)

Fecha: 14/11/2026. Herramientas: `vendor/stageshow/scripts/film.mjs` (Stageshow 1.1.1, commit `299140f`) con Chromium 155.0.8059.84 del sistema (snap) vía `CHROME_PATH=/snap/bin/chromium`, Linux.

**Gold:** `table-edit`. Se conservó: escenario 660 × 400 y compacto 358, ventana de navegador inset 40 px arriba que sale por abajo, filas de 44 px con la misma rejilla de columnas fijas, la celda que se convierte en campo con el anillo dibujado dentro, el destello único al confirmar y el valor dependiente que rueda con `delay`. Se cambió: contenido (lista de posibles clientes en español), el total por el contador «Interesados» en la cabecera, un `Popover` + `Menu` del kit para el cambio de estado (patrón de `share`), acento verde del proyecto (`#2f6b4f`) y tipografía Arial de la web. Escenario compacto de 320 de alto (no 400) para que la ventana no quede más alta que ancha.

**Beats:** 1 abre el selector de estado → 2 elige «Interesado», el menú se cierra y el contador pasa de 2 a 3 un instante después → 3 escribe 18/11/2026 en «Seguimiento» → 4 Intro confirma, destello, la mano se retira al margen. Reproducción única (`play="once"`) de unos 11 s; el botón «Reproducir de nuevo» del anfitrión es el reinicio visible. Fotograma fijo (`poster`): estado final, interesado y con fecha.

**Captured:** anchos 720 (diseño ancho) y 390 (compacto); bucle completo cada 1000 ms ×16, `--states` en ambos anchos, `--reduced --still`; página anfitriona compilada servida por el servidor real en `/demo/` a 1280 y 390 px, con movimiento reducido emulado y botón de reinicio.

**Gate:** última línea en los cuatro rodajes (bucle y estados, 720 y 390):
`rehearsal passed (necessary, not sufficient: references/verify.md and the fresh eye in review.md still stand)`

**Film:**
- `framing: div.ss-window shows 326x384, narrower than tall` (390, primer rodaje) → compacto a 320 de alto → resuelto.
- `framing: div.ss-popover opens within a gutter of the stage's bottom edge` (720, choose) → el menú se abre hacia arriba en ambos diseños → resuelto.
- `appears with no entrance` / `vanishes with no exit` en el texto de la fecha (indicación «dd/mm/aaaa» y cambio de nodo al confirmar) → un único nodo de texto que conserva la fecha escrita; se elimina la indicación → resuelto.
- `uneven inset: the ring on span.sg-ring hangs 8px past its column` (390) → anillo y destello solo sobresalen hacia el hueco izquierdo → resuelto.
- `jump: sg-caret x +7.2px` al teclear → es el avance del cursor de texto con cada carácter; marcado `data-typing` en ese nodo, como indica `rehearse.md`.
- Revisión de fotogramas: la mano quedaba sobre «20/11/2026» al final y durante la escritura → se aparta al margen; el nombre protagonista se truncaba en compacto («Floristería Eje…») → «Flor Ejemplo».
- `npm run check:css`: sin choques de clases. `npm run typecheck`: sin errores.

**Review:** repaso propio contra `verify.md` (encuadre, jerarquía, movimiento, pulido), no independiente. Observaciones que se mantienen:
- La escena usa los neutros del kit (gris cálido y ventana blanca), no el papel crema ni los títulos con serifa del panel real; se reconoce como «un CRM», no necesariamente como este panel. Decisión: mantener la sobriedad del gold; revisable si la propietaria quiere usarla para algo concreto.
- En compacto el menú abierto tapa el título «Posibles clientes» durante ~1 s; es interfaz anclada (no satélite) y no tapa el resultado.
- La filler de la columna de nombre se trunca en compacto («Flores de mues…»); es relleno, no texto del protagonista.

**Assumptions:** la demo es para uso interno (presentación del panel) y no se enlaza desde la landing. Los nombres de floristerías son ficticios y genéricos a propósito; las localidades son reales.

**Unresolved:** revisión independiente («fresh eye», `review.md`): no se ha hecho porque requiere a otra persona o un agente separado.

**Not checked:** tema oscuro (no se publica); Safari y Firefox; dispositivo táctil real; fotogramas a 40–80 ms de cada pulsación con `--at` (solo hojas a 500 y 1000 ms); ritmo real con `requestAnimationFrame` en un equipo lento; volver de pestaña oculta a mitad de reproducción.
