# Proyecto: distribución mayorista de flores

## Objetivo y alcance

Crear una landing en español para una mayorista que reparte flores a floristerías en el área de Vigo y Ourense. Presentar sus servicios con información formal, concreta y comprensible, y facilitar el contacto por teléfono y correo. La atención cercana y los precios competitivos son características facilitadas por la propietaria; no convertirlas en promesas de ahorro ni en comparaciones sin datos.

Crear además un panel privado de gestión comercial para registrar posibles clientes, organizar el seguimiento de floristerías y gestionar las solicitudes procedentes de la landing.

## Redacción y datos

- No usar eslóganes vacíos, superlativos, testimonios ficticios ni cifras inventadas.
- No afirmar entrega diaria, plazos garantizados, catálogo concreto, stock, cobertura provincial completa, pedido mínimo, horarios ni tarifas sin confirmación.
- Cobertura confirmada: área de Vigo y Ourense; confirmar cada localidad y condiciones de reparto mediante contacto. Las localidades de los mapas son referencia geográfica, no cobertura confirmada.
- Confirmado por el usuario (14/11/2026): la empresa tiene 40 años, la fundaron el padre de Andrea y otros tres socios con el nombre de Diflogal y hoy la dirige Andrea (17/11/2026: no mencionar «Diflogal» en la web; la familia ha trabajado en producción y distribución de flor); Todos los Santos es la campaña más importante; se aceptan reservas de campaña (plazos y condiciones pendientes).
- Productos indicados por el usuario (17/11/2026): clavel colombiano, rosas de Ecuador y Colombia, flor de Holanda (tulipán, orquídea de corte, etc.), anthurium y verdes nacionales. Los ejemplos de flor de Holanda son orientativos; no afirmar stock ni variedades concretas.
- Floristerías en los mapas (`public/data/floristerias.json`): ahora contiene datos de **demostración** (floristerías reales presentadas como clientes sin confirmar, a petición expresa del usuario para enseñar la demo). Antes de una publicación real, sustituir por las que indique la propietaria y con su permiso; no ampliar la lista por cuenta propia.
- Pendientes: nombre comercial, teléfono, correo, identidad fiscal, dirección y condiciones del servicio (lista en `docs/pendientes.md`). Centralizar datos públicos en `public/config.js`; no inventarlos.
- La web ofrece información B2B a floristerías; no es una tienda ni permite pagar o confirmar pedidos.

## Skill solicitada: Stageshow

El usuario solicita expresamente la skill `stageshow` de Benji Taylor (https://github.com/benjitaylor/skills/tree/main/stageshow, MIT). Integrada el 14/11/2026 desde el commit `299140f` (versión 1.1.1) en el subproyecto `demo/`:

- Alcance: ilustraciones y demos animadas con React y CSS. Sus clics y cambios de escena son simulados: no implementan acciones del CRM.
- `demo/src/scenes/seguimiento/`: demostración rotulada «Demostración», con datos ficticios, de un contacto que pasa a «Interesado» y recibe fecha de seguimiento. Parte del ejemplo `table-edit`. Se compila a `public/demo/` y no se enlaza desde la landing.
- Procedencia, cambios en el kit (sin logotipos de terceros) y licencias en `demo/README.md`; verificación en `demo/src/scenes/seguimiento/REHEARSAL.md`.
- Para nuevas escenas: leer las referencias de la skill, partir de un ejemplo del autor, verificar escritorio, 390 px y movimiento reducido con `film.mjs --gate`, y no añadirlas a la landing sin una finalidad para las floristerías.

## Base técnica actual

- Node.js 22.13+ sin dependencias en el proyecto principal: `node:http`, `node:sqlite`, módulos JavaScript en el navegador. Decisión justificada en `docs/arquitectura.md`.
- `/`: landing con servicios, cobertura, contacto configurable y formulario de solicitud controlado por `PUBLIC_FORM` (`off`/`test`/`live`). `live` no arranca sin datos comerciales, HTTPS y `PRIVACY_NOTICE_APPROVED=yes`.
- `/acceso/` y `/admin/`: panel protegido por sesión de servidor. Cuenta creada con `npm run owner -- <usuario>`; no hay registro público.
- `public/gl/`: versión en gallego de la landing. Mantener ambas páginas sincronizadas.
- `npm run pages:build` genera `_site/` (solo la parte pública, rutas relativas, `noindex`) para GitHub Pages; el workflow `.github/workflows/pages.yml` solo se lanza a mano. No lanzarlo sin indicación del usuario.
- `npm run local`: vista previa de todo (landing, panel y demo) con el panel sin contraseña mediante `LOCAL_NO_AUTH=true`. `src/config.mjs` lo rechaza en producción, fuera de 127.0.0.1 y con `PUBLIC_FORM=live`. No usar ese modo para nada que no sea ver la web en la propia máquina.
- API: `/api/session`, `/api/leads`, `/api/leads/:id` (con sesión y CSRF) y `/api/public/form`, `/api/public/requests` (pública, con límites).
- Datos en SQLite (`DATABASE_PATH`, por defecto `data/flores.db`), migraciones en `migrations/`. Copias con `npm run db:backup`; operación en `docs/operacion.md`.
- No hay correo automático ni notificaciones. No introducir datos personales reales hasta completar `docs/pendientes.md` y desplegar con HTTPS.
- Mantener accesibilidad por teclado, etiquetas en formularios, errores asociados al campo, contraste y diseño adaptable a móvil.

## Modelo comercial previsto

Cada contacto tendrá: identificador, floristería, persona de contacto opcional, teléfono o email, localidad, zona (Vigo/Ourense), origen (manual/web), estado (nuevo/contactado/interesado/cliente/descartado), notas, próxima acción y fechas de creación/actualización.

No confundir visitas anónimas con contactos identificados. No añadir rastreo, scraping de floristerías, campañas automáticas ni importaciones masivas sin requisitos y autorización específicos.

## Pendiente antes de producción

Implementado: autenticación y autorización de servidor, persistencia con migraciones y validación, formulario conectado al panel con prevención de abuso, pruebas de acceso, validación y captación. Falta:

1. Datos comerciales y condiciones del servicio (lista en `docs/pendientes.md`).
2. Aviso legal y de privacidad completos y revisados por un profesional; decidir plazos de conservación. No presentar el borrador de `/privacidad/` como asesoramiento jurídico.
3. Elegir alojamiento con disco persistente y HTTPS (proxy inverso), programar copias fuera del servidor. No contratar ni publicar sin indicación del usuario.
4. Cualquier notificación por correo de nuevas solicitudes es una tarea posterior; no enviar comunicaciones comerciales automáticamente.

## Comprobaciones

Ejecutar `npm run check` y `npm test`. Arrancar con `npm run dev` y revisar landing, acceso y panel en escritorio y móvil cuando haya navegador disponible. Para la demo, `npm run typecheck` en `demo/` y los rodajes de `demo/README.md`. Anotar en `progress.md` qué se hace y por qué, y cualquier límite de verificación. El usuario ha pedido una base de proyecto local; no registrar hosting ni publicar por defecto.
