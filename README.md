# Mayorista de flores · Vigo y Ourense

Landing B2B para floristerías y panel privado de gestión comercial. Node.js 22 sin dependencias en el proyecto principal; SQLite incluido en Node. Requisitos y pautas en [AGENTS.md](AGENTS.md); registro del trabajo en [progress.md](progress.md).

**Estado:** versión local revisable. No está publicada. Faltan los datos comerciales y la revisión del aviso de privacidad para recoger datos reales: ver [docs/pendientes.md](docs/pendientes.md).

## Ver la web en local (un solo comando)

```bash
npm run local
```

Compila la demo (instala sus dependencias la primera vez), arranca el servidor y abre el navegador. El **panel entra sin contraseña** en este modo (`LOCAL_NO_AUTH`), que el servidor solo acepta escuchando en 127.0.0.1 y nunca con `NODE_ENV=production`. Opciones: `--no-open` (no abrir el navegador), `--no-demo` (no compilar la demo), `PORT=3001 npm run local`. Usa solo datos ficticios.

## Arranque con acceso protegido

Requiere Node.js 22.13 o superior. El proyecto principal no necesita `npm install`.

```bash
cp .env.example .env              # opcional; server.mjs lo carga si existe
npm run owner -- propietaria      # crea la cuenta del panel (pide contraseña, mínimo 12 caracteres)
npm run dev
```

- Landing: http://127.0.0.1:3000/
- Acceso al panel: http://127.0.0.1:3000/acceso/ → http://127.0.0.1:3000/admin/
- Borrador de privacidad: http://127.0.0.1:3000/privacidad/
- Demostración visual (tras `npm run demo:build`): http://127.0.0.1:3000/demo/

La base de datos se crea en `data/flores.db` con las migraciones al arrancar.

## Qué hace

**Landing** (`public/index.html`, en gallego en `public/gl/`): portada con una ilustración al óleo del invernadero (`scripts/generate-hero.mjs` la pinta y `scripts/render-hero.mjs` la convierte a JPEG con Chromium), datos clave, historia de la empresa (40 años, fundada como Diflogal, hoy dirigida por Andrea), productos destacados (clavel de Holanda, orquídeas de Colombia, margarita portuguesa), mosaico de servicios, cómo trabajamos, campañas con reserva (Todos los Santos destacada), zona de reparto con mapas, preguntas frecuentes y contacto. Fondo de campo de claveles dibujado a trazo (`npm run field` regenera el fondo y la portada; necesita Chrome o Chromium para el JPEG) en dos capas que suben a distinta velocidad al hacer scroll (`public/field.js`; quieto con «reducir movimiento»). El fondo gana presencia al llegar a contacto, que además tiene su propia franja de claveles. Fotos genéricas CC0 de forma provisional en el resto de secciones, con créditos en `public/img/fotos/CREDITOS.md`. Teléfono y correo salen de `public/config.js`; mientras no se confirmen se muestran como pendientes y sin enlaces. Incluye un formulario de solicitud de información (floristería, localidad, zona, teléfono o correo, mensaje opcional) que se controla con `PUBLIC_FORM`:

| Modo | Comportamiento |
|---|---|
| `test` (por defecto en desarrollo) | Visible con aviso «solo datos ficticios» |
| `off` (por defecto con `NODE_ENV=production`) | Oculto; la API responde 503 |
| `live` | Solo arranca con nombre comercial, teléfono o correo, HTTPS y `PRIVACY_NOTICE_APPROVED=yes` |

La confirmación al visitante solo aparece cuando el servidor ha guardado la solicitud. No se envían correos ni comunicaciones automáticas.

**Panel** (`/admin/`, solo con sesión): alta, edición y borrado de contactos; búsqueda y filtros por zona, estado y origen (web/manual); próxima acción, notas y fecha de seguimiento; contadores; aviso de posibles duplicados (mismo correo o teléfono) sin descartar nada; protección contra sobrescribir cambios hechos en otra pestaña.

**Seguridad:** cuenta única creada por terminal (sin registro público), contraseña con scrypt, sesiones en servidor revocables (caducan a las 2 h de inactividad y a las 12 h), cookie `HttpOnly`/`SameSite=Strict` (`Secure` en producción), token CSRF y comprobación de origen en escrituras, bloqueo temporal tras intentos fallidos, límite de envíos del formulario, validación en servidor y restricciones en la base, cabeceras CSP. `robots.txt` y `noindex` excluyen el panel de buscadores, pero la protección real es la autenticación.

Decisiones técnicas: [docs/arquitectura.md](docs/arquitectura.md). Copias, restauración y borrado: [docs/operacion.md](docs/operacion.md).

## Versión en gallego

`public/gl/index.html` es la misma landing en gallego (norma RAG). Comparte estilos, scripts, imágenes y datos con la versión en castellano; **cualquier cambio de contenido debe hacerse en las dos páginas**. Los mensajes de validación del formulario y la página de privacidad siguen solo en castellano.

## Mapas y floristerías

La sección de reparto muestra dos mapas esquemáticos dibujados (`npm run maps`). Las floristerías se añaden en `public/data/floristerias.json`, solo las confirmadas y con su permiso; ver [docs/mapas.md](docs/mapas.md).

## GitHub Pages (vista previa estática)

```bash
npm run pages:build   # genera _site/ con la parte pública
```

- Copia la landing (es y gl), privacidad, estilos, scripts, imágenes y datos. **No** incluye el panel, el acceso, la API ni la demo: GitHub Pages solo sirve archivos estáticos.
- En esa versión el formulario no aparece; el contacto y las reservas se hacen por teléfono o correo (pendientes en `public/config.js`).
- Las páginas llevan `noindex` mientras sea una vista previa (`PAGES_INDEX=true npm run pages:build` lo quita).
- Todas las rutas son relativas, así que funciona en `https://<usuario>.github.io/<repositorio>/`.
- Publicación: `.github/workflows/pages.yml` se ejecuta **solo a mano**. En GitHub, *Settings → Pages → Source: GitHub Actions* y después *Actions → Publicar en GitHub Pages → Run workflow*. Subir cambios a `main` no publica nada por sí solo.

## Demostración visual (Stageshow)

`demo/` es un subproyecto aparte (React + Vite) con una animación simulada del panel hecha con el kit de [Stageshow](https://github.com/benjitaylor/skills/tree/main/stageshow) (MIT). Datos ficticios, rotulada «Demostración», sin acceso a la API ni a los contactos. No se enlaza desde la landing. Procedencia de los archivos y uso en [demo/README.md](demo/README.md); verificaciones en `demo/src/scenes/seguimiento/REHEARSAL.md`.

```bash
cd demo && npm install --ignore-scripts && cd ..
npm run demo:build
```

## Comprobaciones

```bash
npm run check     # sintaxis de todos los módulos
npm test          # 22 pruebas: validación, acceso anónimo, sesiones, CSRF, persistencia, captación
```

Las pruebas arrancan la aplicación en un puerto libre con una base de datos temporal. El recorrido completo en navegador (formulario → panel → seguimiento → estado → borrado, móvil y teclado) se verificó con Chromium; ver `progress.md`.

## Estructura

```text
server.mjs                  Arranque del servidor
src/app.mjs                 Rutas HTTP, API y entrega de páginas
src/auth.mjs                Contraseñas, sesiones y límite de intentos
src/db.mjs                  SQLite y migraciones
src/leads-repo.mjs          Consultas de contactos y política de duplicados
src/config.mjs              Variables de entorno y condiciones del modo live
migrations/                 Esquema SQL versionado
scripts/                    owner (cuenta), backup (copias), check (sintaxis)
public/index.html           Landing
public/config.js            Datos de contacto pendientes de completar
public/request.js           Formulario de solicitud
public/shared/validation.js Reglas comunes a navegador y servidor
public/acceso/              Inicio de sesión
public/admin/               Panel
public/privacidad/          Borrador del aviso de privacidad
demo/                       Demostración Stageshow (subproyecto aparte)
docs/                       Arquitectura, operación y datos pendientes
tests/                      Pruebas con node:test
```
