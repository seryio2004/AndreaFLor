# Registro de progreso

Bitácora del trabajo sobre `TASKS_CLAUDE.md`: qué se hace, en qué orden y por qué. Las entradas más recientes van al final.

## Estado actual (14/11/2026, tras la sesión 5)

**Cómo verlo:** `npm run local` compila la demo, arranca el servidor y abre la web, con el panel sin contraseña solo en esta máquina.

**Hecho y verificado** (`npm run check` 25/25 y `npm test` 24/24; capturas en Chromium a 1440 y 390 px):

| Área | Estado |
|---|---|
| Landing | Portada al óleo del invernadero, banda de datos, productos (clavel de Holanda, orquídeas de Colombia, margarita portuguesa), mosaico de servicio, cómo trabajamos, reparto, preguntas frecuentes y contacto con formulario |
| Fondo | Campo de claveles a trazo en dos capas con profundidad al hacer scroll; más intenso en contacto; quieto con «reducir movimiento» |
| Imágenes | Fotos genéricas CC0, marcadas como ilustrativas (`public/img/fotos/CREDITOS.md`); fondo y portada generados con `npm run field` |
| Panel | Acceso con cuenta y contraseña (scrypt), sesiones revocables, CSRF, límite de intentos; contactos en SQLite con filtros, seguimiento y aviso de duplicados |
| Captación | Formulario público con modos `off`/`test`/`live`; `live` bloqueado hasta tener datos, HTTPS y privacidad revisada |
| Demo Stageshow | Subproyecto `demo/`, servido en `/demo/`, con verificación en `REHEARSAL.md` |

**Pendiente:**
- **De la propietaria:** nombre comercial, teléfono, correo, datos fiscales, condiciones de reparto, confirmación de los productos destacados, fotos propias y decisiones de privacidad (`docs/pendientes.md`).
- **Técnico:** puntos 1 a 5 de `REVISION_CLAUDE.md`.
  1. El límite de intentos de acceso se puede saltar con peticiones simultáneas.
  2. La clave de reenvío del formulario no se compara con el contenido.
  3. Ante una respuesta perdida, el panel dice que no se guardó aunque quizá sí.
  4. Se puede cambiar de contacto mientras otro se está guardando.
  5. El control de versiones de los contactos se basa en la fecha.
- **Verificación:** falta la revisión independiente de la demo y no se ha probado en Safari, Firefox ni con lectores de pantalla.
- **Producción:** alojamiento con disco persistente y HTTPS. No se ha publicado ni contratado nada.

## 2026-11-14 · Sesión 1

### 1. Revisión de la base (tarea 1)

**Qué:** lectura de `AGENTS.md`, `README.md`, `TASKS_CLAUDE.md` y todo el código; `npm run check` (correcto) y `npm test` (4/4 correctas) con Node 22.22.1; arranque local y capturas con Chromium sin interfaz de `/` y `/admin/` a 1280 px y 390 px.

**Por qué:** la tarea pide partir de la base existente y anotar problemas concretos antes de cambiar nada.

**Problemas detectados en la base:**

- Servidor: `/admin` sin barra final devuelve 404 (intenta leer un directorio) en lugar de redirigir; `HEAD` no envía `Content-Length`; no hay rutas de API ni límite de cuerpo.
- Panel: datos en localStorage (no compartidos, se pierden al limpiar el navegador); sin autenticación; los errores de validación se anuncian en la zona `role="status"` pero no se marcan en el campo (`aria-invalid`) ni se mueve el foco al campo erróneo; el teléfono admite cualquier combinación de 6 cifras y signos.
- Panel: el modelo no tiene campo «próxima acción» separado de las notas ni campo de origen visible; no hay detección de posibles duplicados.
- Landing: sin formulario de solicitud (correcto mientras no haya backend); en móvil el menú oculta «Servicios» y «Reparto» y deja solo «Contacto», aceptable porque la página es corta.
- Accesibilidad y móvil: contraste, etiquetas, enlace «Saltar al contenido» y foco visible ya correctos. La tabla del panel se desplaza en horizontal en móvil (aceptable, con contenedor `overflow-x`).
- No hay `robots.txt`; el panel solo tiene `noindex` en HTML.

### Decisión técnica (tarea 1)

Ver `docs/arquitectura.md`. Resumen: se mantiene Node.js 22 sin framework ni dependencias, con `node:sqlite` (incluido en Node 22) para la base de datos, migraciones SQL versionadas, sesiones en servidor con cookie `HttpOnly` y token CSRF. **Por qué:** el proyecto ya era deliberadamente sin dependencias, el volumen de datos es pequeño (una mayorista con decenas o cientos de contactos) y una sola instancia con SQLite basta; añadir Express/Postgres sería desproporcionado. El acceso a datos queda aislado en `src/db.mjs` para poder cambiar a `better-sqlite3` o PostgreSQL si `node:sqlite` (experimental en Node 22) diera problemas.

Stageshow (tarea 3) necesita React, Vite y `npm install`; se hará como subproyecto separado en `demo/` para no añadir dependencias al proyecto principal ni mezclar la demo con el CRM.

### 2. Panel protegido (tarea 4)

**Qué:** `src/auth.mjs` y rutas en `src/app.mjs`.

- Cuenta única creada desde terminal (`npm run owner -- <usuario>`), sin registro público. Contraseña ≥ 12 caracteres con hash scrypt; nunca en código.
- Sesión en servidor: token aleatorio de 32 bytes en cookie `HttpOnly; SameSite=Strict` (`Secure` y prefijo `__Host-` en producción); en la base solo se guarda su SHA-256. Caducidad por inactividad (2 h) y absoluta (12 h), configurables.
- Escrituras: token CSRF por sesión en cabecera `X-CSRF-Token` + comprobación de `Origin`/`Sec-Fetch-Site` + cuerpo obligatoriamente JSON.
- Fuerza bruta: máximo 5 fallos por usuario y 10 por IP cada 15 min (429 con `Retry-After`). Usuario inexistente se verifica contra un hash ficticio para no revelar qué cuentas existen.
- Las páginas `/admin/*` se redirigen a `/acceso/` sin sesión (el servidor no las entrega) y la API devuelve 401. `/api/session` DELETE borra la sesión del servidor: la cookie copiada deja de servir.

**Por qué así:** es una sola persona usuaria; un proveedor externo de identidad añadiría coste y dependencia sin beneficio. Las sesiones en base de datos permiten revocarlas de verdad (a diferencia de un JWT). `SameSite=Strict` + CSRF + Origin son tres capas baratas.

**Límite conocido:** el limitador está en memoria; se reinicia al reiniciar el proceso y no sirve con varias instancias (no previstas).

### 3. Persistencia en servidor (tarea 5)

**Qué:** `node:sqlite` + `migrations/001_inicial.sql` (aplicadas automáticamente y registradas en `schema_migrations`), repositorio `src/leads-repo.mjs` con consultas preparadas, API `GET/POST /api/leads`, `GET/PUT/DELETE /api/leads/:id`. Validación compartida cliente/servidor en `public/shared/validation.js` (el servidor siempre revalida) más restricciones `CHECK` en la tabla. Cuerpo máximo 16 KB.

- Panel reescrito sobre la API: estados de carga, error con «Reintentar», vacío y confirmación; «Contacto guardado» solo tras respuesta correcta. Errores marcados en el campo (`aria-invalid` + foco). Sesión caducada: aviso con enlace, sin perder lo escrito.
- Campos nuevos según el modelo de `AGENTS.md`: origen (manual/web), próxima acción separada de notas y mensaje original de la web (solo lectura).
- Conflictos: si el contacto cambió desde que se abrió (otra pestaña), el servidor responde 409 en vez de sobrescribir.
- **Duplicados:** nunca se descartan ni fusionan. Mismo correo o mismo teléfono (solo cifras) → etiqueta «Posible duplicado» para revisión manual. Un reenvío accidental del formulario público (misma clave de solicitud) no crea un segundo registro.
- Se elimina localStorage; los registros ficticios antiguos no se importan.
- `npm run db:backup` hace copia consistente con `VACUUM INTO`. Restauración y borrado documentados en `docs/operacion.md`.

**Por qué:** SQLite cubre de sobra el volumen previsto, es un único archivo fácil de copiar y no necesita servicio aparte. `node:sqlite` evita dependencias nativas; su aviso experimental se silencia en los scripts y el riesgo queda acotado a `src/db.mjs`.

### 4. Captación desde la landing (tarea 6)

**Qué:** sección «Solicitud de información» en `/#contacto` (`public/request.js`), campos mínimos: floristería, localidad, zona, teléfono o correo, mensaje opcional. Se guarda con origen `web` y estado `nuevo`.

- Protección: campo trampa oculto, 5 envíos por IP cada 10 min, comprobación de origen, clave única por envío (idempotencia ante doble clic).
- Éxito solo tras 201/200 del servidor; ante error o corte de red se explica y se conservan los datos.
- Modo controlado por `PUBLIC_FORM`: `test` (por defecto en desarrollo, con aviso «solo datos ficticios»), `off` (por defecto en producción, el formulario no se muestra y la API responde 503) y `live`, que **no arranca** sin nombre comercial, teléfono o correo, `PRIVACY_NOTICE_APPROVED=yes` y HTTPS.
- No se envía ningún correo ni comunicación automática.

**Por qué:** la tarea 7 exige no recoger datos reales hasta tener privacidad, acceso y persistencia completos; el modo `live` bloqueado por configuración convierte esa regla en algo que el código hace cumplir.

### 5. Verificación de las tareas 4–6

- `npm test`: 22 pruebas (acceso anónimo, redirecciones, CSRF, origen, cierre de sesión, caducidad, bloqueo de intentos, validación 422/413/415, SQL con comillas, persistencia tras reinicio, duplicados, recorrido completo, formulario desactivado).
- Navegador real (Chromium sin interfaz controlado por CDP, script en el directorio temporal de la sesión): validación en cliente con foco y `aria-invalid`; **error 500 simulado → sin mensaje de éxito y datos conservados**; envío correcto; acceso erróneo y correcto; edición nuevo → interesado con seguimiento; alta manual; filtro por origen; borrado con confirmación; cierre de sesión y vuelta a `/admin/` redirigida; primer Tab = «Saltar al contenido»; sin desplazamiento horizontal a 390 px.
- Corrección tras revisar capturas: en móvil la tabla ocultaba «Editar» fuera de pantalla → las filas pasan a tarjetas con etiqueta por campo.

### 6. Datos pendientes y privacidad (tareas 2 y 7)

**Qué:** `docs/pendientes.md` reúne en una sola lista los datos comerciales que faltan y una propuesta de finalidad, acceso, conservación y corrección/supresión para decidir con la propietaria. `/privacidad/` es un **borrador** con los huecos marcados y `noindex`; el formulario enlaza a él. No hay casilla de marketing ni suscripción implícita.

**Por qué no se marcan como hechas:** dependen de datos y decisiones de la propietaria y de una revisión profesional. No se ha inventado ningún dato: `public/config.js` sigue vacío y la web los muestra como pendientes. Los enlaces `tel:`/`mailto:` ya se generan solos cuando el dato tiene formato válido.

### 7. Demostración con Stageshow (tarea 3)

**Qué:** subproyecto `demo/` (React 18 + Vite 6, versiones fijadas del lockfile del autor) con el kit copiado en `demo/vendor/stageshow/` y la escena `src/scenes/seguimiento/`: un contacto ficticio pasa de «Nuevo» a «Interesado» con un menú, el contador de interesados sube y se escribe la fecha de seguimiento. Rotulada «Demostración», con botón «Reproducir de nuevo» y fotograma final para movimiento reducido. Se compila a `public/demo/` (`npm run demo:build`) y se sirve en `/demo/`, excluida de `robots.txt` y sin enlace desde la landing.

**Cómo, siguiendo la skill:** lectura de `SKILL.md` y de `kit.md`, `craft.md`, `framing.md`, `rehearse.md`, `verify.md` y `review.md`; elección del gold `table-edit` (editar una fila y que un total cambie después) y filmación de su fotograma junto al propio; copia de su estructura; rodajes con `film.mjs --gate` a 720 y 390 px (bucle y estados) hasta `rehearsal passed`, y fotograma con movimiento reducido. Fallos encontrados y corregidos: ventana más alta que ancha en móvil, menú demasiado cerca del borde, texto de la fecha que aparecía y desaparecía sin transición, anillo del campo fuera de su columna, cursor tapando fechas y nombre protagonista truncado. Detalle en `demo/src/scenes/seguimiento/REHEARSAL.md`.

**Por qué así:**
- Subproyecto aparte para no meter React ni `node_modules` en la web principal ni mezclar la demo con el CRM; no importa nada de `src/` ni de la API.
- Se excluyeron del kit los logotipos de terceros (`kit/brands/`, `BrandMark`), que tienen licencias propias y no hacen falta. Procedencia y cambios en `demo/README.md`.
- `npm install --ignore-scripts`: no se ejecutan instaladores de paquetes sin revisar.
- Comprobado dentro del servidor real: la CSP estricta (`script-src 'self'`) no bloquea nada, sin errores de consola.

**Límite:** la revisión independiente («fresh eye») que pide la skill no se ha hecho: requiere otra persona o un agente separado y no se ha lanzado ninguno sin autorización. Tampoco se ha probado en Safari/Firefox ni en un dispositivo táctil real.

### 8. Verificación y entrega (tarea 8)

- `npm run check`: 20/20 módulos sin errores. `npm test`: 22/22. `demo`: `typecheck` sin errores y `check:css` sin choques.
- Recorrido en Chromium 155 (sin interfaz, por CDP): ver apartado 5; demo en `/demo/` a 1280 y 390 px con movimiento reducido.
- Documentación actualizada: `README.md`, `AGENTS.md`, casillas de `TASKS_CLAUDE.md`, `docs/arquitectura.md` (incluye pasos para un futuro despliegue), `docs/operacion.md`, `docs/pendientes.md`, `.env.example`.
- No se ha publicado ni contratado nada.

**Bloquea producción:** datos comerciales; aviso legal y de privacidad revisados; plazos de conservación; alojamiento con disco persistente y HTTPS.

**No verificado:** lectores de pantalla reales (solo estructura, etiquetas, foco y regiones `aria-live`); Safari y Firefox; carga concurrente; comportamiento detrás de un proxy real (`TRUST_PROXY`).

## 2026-11-14 · Sesión 2: vista local sin contraseña

**Petición:** quitar la contraseña y tener un comando npm que lance todo para ver la web.

**Qué:**
- `npm run local` (`scripts/local.mjs`): instala las dependencias de la demo si faltan, la compila, arranca el servidor con recarga automática, espera a que responda, muestra las direcciones y abre el navegador (`--no-open`, `--no-demo`).
- Modo `LOCAL_NO_AUTH=true`: el panel y su API funcionan con una sesión fija del proceso, sin pedir usuario ni contraseña; «Cerrar sesión» se oculta y el aviso dice «Vista local sin contraseña».
- Arreglo: con `--watch`, la opción `--env-file-if-exists` hacía caer Node si no había `.env`, lo que rompía también `npm run dev`. Ahora `server.mjs` carga `.env` solo si existe.
- De paso, se corrige el punto 6 de `REVISION_CLAUDE.md`: una cookie mal formada se ignora en lugar de provocar un error 500.

**Por qué así y no quitando la autenticación:** `AGENTS.md` y la tarea 4 exigen un panel protegido antes de publicar; borrar el login lo dejaría abierto en cuanto se desplegara. El modo local da lo que se pidió (ver todo sin contraseña) sin tocar la protección: el servidor se niega a arrancar con `LOCAL_NO_AUTH` en producción, escuchando fuera de 127.0.0.1 o con el formulario en `live`. El CSRF y el control de origen siguen activos también en local.

**Verificación:** `npm test` 24/24 (dos pruebas nuevas: restricciones del modo local y cookie mal formada). `npm run local` probado en otro puerto: `/`, `/admin/`, `/demo/`, `/privacidad/` responden 200 y `/acceso/` redirige al panel; en Chromium, alta de un contacto sin iniciar sesión.

**Pendiente de `REVISION_CLAUDE.md`** (revisión estática hecha a mitad de la sesión 1; su punto 7 ya está resuelto): puntos 1 a 5 sin corregir. Son el límite de intentos de acceso, que se puede superar con peticiones simultáneas; la clave de reenvío del formulario, que no se compara con el contenido; el mensaje «no se ha guardado» cuando se pierde la respuesta; poder cambiar de contacto mientras se guarda; y el control de versiones basado en la fecha.

## 2026-11-14 · Sesión 3: rediseño de la landing

**Petición:** fotos genéricas (flores, invernaderos, camiones de reparto), inspiración en la web de Veraleza, más contenido, fondo de campo de claveles dibujado a mano, minimalista, que reaccione al hacer scroll sin ser protagonista. Además, hablar del clavel de Holanda, las orquídeas de Colombia y la margarita portuguesa.

**Qué:**
- **Inspiración (veraleza.com):** se tomó la estructura, no el contenido: portada con foto a sangre y titular, banda de color con datos clave, mosaico 2 × 2 de fotos con título, contacto a dos columnas con foto. No se copian textos, marca ni cifras (sus «+100.000 referencias» o «24/48 h» no aplican aquí). Se mantienen la paleta propia (verde tinta, papel) con un verde oliva para la banda y la tipografía Georgia/Arial.
- **Fotos:** 8 imágenes CC0 obtenidas con la API de Openverse (rawpixel y StockSnap), elegidas viendo hojas de contacto y guardadas en local (`public/img/fotos/`), porque la CSP solo permite imágenes del propio sitio. Créditos y enlaces en `CREDITOS.md`; en la web se marcan como «Imagen ilustrativa» para no hacerlas pasar por instalaciones o vehículos propios.
- **Fondo:** `scripts/generate-field.mjs` genera dos SVG deterministas con claveles a trazo (tallo, hojas estrechas en pares, cáliz, corola dentada con una mancha rosa tipo acuarela) y hierba baja; más densos a los lados para dejar el centro despejado. `public/field.js` escribe una única variable CSS por fotograma con el avance del scroll y las capas suben 70 px y 190 px a distinta velocidad: el campo «crece» y gana profundidad al bajar. Opacidad 0,28 y 0,36; sin movimiento con `prefers-reduced-motion`.
- **Contenido nuevo:** banda de datos (servicio a floristerías, reparto en Vigo y Ourense, trato cercano), productos con origen, mosaico de servicio, cuatro pasos de trabajo, reparto con foto, cinco preguntas frecuentes y pie con navegación.
- **Productos:** solo hechos generales y comprobables (Países Bajos como centro europeo del comercio de flor; Colombia, gran diversidad de orquídeas, con la *Cattleya trianae* como flor nacional, y gran exportador; la margarita como flor protagonista o de relleno). No se afirman variedades, stock, calibres ni precios; una nota lo dice expresamente. Se han suavizado tres frases del primer borrador que prometían más de lo confirmado. Lista anotada en `docs/pendientes.md` para que la propietaria la confirme.

**Verificación:** Chromium a 1440 × 900 y 390 × 844 en cinco posiciones de scroll: la variable del fondo avanza de 0 a 1; sin scroll horizontal; sin errores de consola tras añadir el favicon (era el único 404). Corregido tras las capturas: titular en tres líneas y fotos de producto con alturas distintas (el atributo `height` anulaba `aspect-ratio`). `npm run check` y `npm test` correctos.

**Límites:** las fotos de Openverse solo llegan a unos 1000 px de ancho; la de portada se ve algo blanda en pantallas grandes. Conviene sustituirlas por fotos propias o de más resolución.

## 2026-11-14 · Sesión 4: más campo de claveles y portada dibujada

**Petición:** que el fondo de claveles gane protagonismo, sobre todo en contacto, y sustituir la foto de portada por un dibujo de la misma imagen en el estilo del fondo.

**Qué:**
- **Portada:** `scripts/generate-hero.mjs` modela el invernadero de la foto en 3D sencillo (cerchas a dos aguas, correas, muro del fondo, dos bancadas con frente y patas, macetas con hojas y claveles, cestas colgantes con plantas que caen y pasillo de grava) y lo proyecta en perspectiva. Así el dibujo conserva la profundidad de la foto. Mismo trazo y colores que el fondo (verde salvia, rosa con mancha de acuarela), con temblor de mano y salida determinista. El punto de fuga está desplazado a la derecha y un degradado de papel a la izquierda deja leer el titular, ahora en verde tinta, igual que la cabecera. En móvil el dibujo va debajo del texto, con fundido por arriba y por abajo.
- Tras la primera versión se corrigió: plantas cercanas que parecían paraguas (ahora maceta con hojas), cestas con forma de labios (ahora cuenco con borde), grava en manchas grandes (ahora fina) y bancadas sin frente.
- **Fondo:** opacidad base de 0,28/0,36 a 0,40/0,52. `field.js` calcula cuánto de la sección de contacto se ve (`--field-boost`, de 0 a 1): al llegar, el campo sube hasta 0,70/0,92 y se eleva 30 px y 90 px más. La sección de contacto pasa de un color casi opaco a un degradado translúcido y termina en una franja propia de claveles antes del pie.
- `npm run field` regenera el fondo y la ilustración de portada.

**Verificación:** Chromium a 1440 y 390 px en cinco posiciones de scroll. `--field-boost` vale 0 hasta contacto y 1 dentro. Sin scroll horizontal ni errores de consola. Texto legible sobre el campo en contacto. `npm run check` y `npm test` correctos.

## 2026-11-14 · Sesión 5: portada al óleo

**Petición:** a la imagen principal le faltan color y relleno; darle un estilo más de óleo.

**Qué:**
- `scripts/generate-hero.mjs` reutiliza la escena 3D del invernadero, pero ahora la pinta con unas 25.000 pinceladas cortas y curvas: anchura y opacidad variables, color con ligeras variaciones de tono y luz, y orientadas según la perspectiva. Se pinta de lejos a cerca. Debajo hay una capa base de color por zonas para que no quede lienzo desnudo. Encima, un filtro de desplazamiento irregulariza los bordes como un empaste, más una textura de lienzo y la luz cálida del fondo. Las flores van en tandas de color a lo largo de las bancadas (rosa, blanco, rojo, coral, magenta, amarillo), como en un cultivo.
- `scripts/render-hero.mjs` convierte ese SVG (3,4 MB, demasiado pesado para la web) a un JPEG de 2400 × 1350 y unos 380 KB, usando Chromium sin interfaz. El SVG de trabajo se guarda en `art/`, fuera de `public/`, y se ignora en git porque se regenera de forma determinista. `npm run field` encadena fondo, óleo y JPEG.
- Iteraciones tras ver cada resultado: esquinas inferiores vacías (se pintaron el frente de las bancadas y el suelo bajo ellas), cestas que formaban una cortina (menos y más separadas), pinceladas cercanas enormes (tamaño limitado), lienzo visible en el pasillo (capa base y el doble de grava).
- El degradado de papel sobre la portada es más corto, para que se vea más color sin perder la lectura del titular. Se elimina la versión anterior a trazo.

**Verificación:** capturas a 1440 y 390 px, sin errores de consola. `npm run check` y `npm test` correctos.

## 2026-11-14 · Sesión 6: repositorio

**Qué:** `git init` en la rama `main`, primer commit con todo el proyecto (186 archivos) y subida a `git@github.com:seryio2004/AndreaFLor.git`, que estaba vacío.

**Revisado antes de subir:** `.gitignore` excluye `.env`, las bases de datos (`data/`, `*.db`), las copias (`backups/`), `node_modules`, la demo compilada (`public/demo/`, se regenera con `npm run demo:build`) y el SVG de trabajo del óleo (`art/`, se regenera con `npm run field`). No hay credenciales en el código; la contraseña de `tests/helpers.js` es solo de pruebas.
