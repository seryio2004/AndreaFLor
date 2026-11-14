# Tareas para Claude

## Encargo

Continúa este proyecto de una mayorista de flores que suministra a floristerías en el área de Vigo y Ourense. Lee primero `AGENTS.md` y `README.md`, revisa el código existente y trabaja sobre esta base. Actualiza las casillas solo cuando se cumplan los criterios de aceptación. Avanza con las tareas independientes aunque falten datos comerciales; indica los bloqueos sin inventar información.

El objetivo es una landing formal con servicios y contacto, y un panel privado para captar y gestionar posibles clientes. No usar eslóganes vacíos, testimonios inventados, tarifas ficticias ni promesas de reparto sin confirmar. No añadir tienda, pagos, scraping, rastreo de visitantes ni campañas automáticas. No publicar ni contratar servicios como parte de este encargo.

## Estado a 14/11/2026

Tareas 1, 3, 4, 5, 6 y 8 completadas en local; detalle y motivos en `progress.md`. Quedan abiertas las casillas que dependen de la propietaria (datos comerciales, textos y decisiones de privacidad): lista en `docs/pendientes.md`. La revisión independiente de la demo («fresh eye» de Stageshow) está pendiente y anotada en su `REHEARSAL.md`.

## Estado inicial (antes de la sesión del 14/11/2026)

Ya existen una landing adaptable, datos públicos centralizados en `public/config.js`, un panel local con alta/edición/borrado, filtros, estados, notas y seguimiento, y pruebas de lógica. El servidor es Node.js 22 y la interfaz usa HTML, CSS y JavaScript sin dependencias. El panel usa localStorage y solo admite datos ficticios. No hay autenticación, backend comercial, base de datos ni captación pública. Stageshow está localizada pero no instalada ni integrada.

## 1. Revisar la base y definir la implementación

- [x] Ejecutar `npm run check` y `npm test`; arrancar el proyecto y revisar ambas rutas.
- [x] Revisar validación, manejo de errores, accesibilidad y adaptación móvil; anotar problemas concretos.
- [x] Elegir y documentar una arquitectura proporcionada para API, autenticación y base de datos, con migraciones y despliegue futuro. Mantener el código útil existente; justificar cualquier cambio de framework.

**Aceptación:** instrucciones reproducibles y decisión técnica documentada, con un camino claro desde el prototipo hasta el panel protegido.

## 2. Completar los datos y el contenido comercial

- [x] Recopilar en una única lista los datos pendientes: nombre comercial, teléfono, email, identidad del titular, dirección aplicable y condiciones reales de suministro y reparto.
- [ ] Incorporar únicamente los datos confirmados a la configuración y a los textos.
- [ ] Revisar servicios, cobertura y contacto con redacción formal, directa y específica para floristerías.
- [x] Añadir enlaces `tel:` y `mailto:` cuando los datos sean válidos; mantener los pendientes explícitos durante el desarrollo.

**Aceptación:** ningún dato inventado ni enlace de contacto ficticio. La ausencia de información comercial no bloquea el desarrollo del backend.

## 3. Incorporar Stageshow con un alcance definido

Fuente original: https://github.com/benjitaylor/skills/tree/main/stageshow

- [x] Leer `SKILL.md`, revisar los archivos necesarios y preparar la skill para este proyecto siguiendo sus instrucciones, sin ejecutar instaladores remotos sin revisar.
- [x] Crear una demostración visual independiente del panel, con datos ficticios y el rótulo «Demostración». Mostrar una acción concreta, por ejemplo pasar un contacto de nuevo a interesado y programar su seguimiento.
- [x] Usar React y el kit de Stageshow para esa escena; partir del ejemplo del autor más adecuado, respetar la licencia y documentar los archivos incorporados y su procedencia.
- [x] Mantener la demo separada del CRM funcional y de su almacenamiento. No incluirla en la landing destinada a floristerías por defecto; ubicarla en una página local de demostración.
- [x] Verificar escritorio, móvil, movimiento reducido y los controles de reproducción según la skill. Documentar comprobaciones y límites en `REHEARSAL.md`.

**Aceptación:** escena identificada como simulación, sin efectos sobre contactos reales, con las verificaciones exigidas por Stageshow. No afirmar que la skill implementa la gestión comercial.

## 4. Proteger el panel y sus API

- [x] Implementar acceso privado para la propietaria mediante autenticación de servidor o un proveedor adecuado; evitar registro público de usuarios por defecto.
- [x] Comprobar autorización en cada operación de lectura y escritura, no solo en la interfaz.
- [x] Incorporar cierre de sesión, caducidad de sesión y protección frente a intentos abusivos de acceso.
- [x] Mantener secretos en variables de entorno y proporcionar `.env.example` sin valores reales. Proteger las sesiones y las peticiones que modifican datos según el mecanismo elegido.

**Aceptación:** una sesión anónima no puede consultar ni modificar contactos mediante acceso directo a páginas o API. Cerrar sesión revoca el acceso.

## 5. Sustituir localStorage por persistencia de servidor

- [x] Crear esquema y migraciones para contactos: identificador, floristería, persona opcional, teléfono o email, localidad, zona, origen, estado, notas, próxima acción y fechas.
- [x] Implementar API protegida de alta, consulta, edición y borrado con validación de servidor, límites de tamaño y consultas parametrizadas.
- [x] Conservar los filtros, estados y seguimiento existentes, conectándolos a la API.
- [x] Añadir estados de carga, error, vacío y confirmación; no indicar que una acción se ha guardado si falla el servidor.
- [x] Definir una política de posibles duplicados, conservando solicitudes legítimas; no descartar contactos silenciosamente.
- [x] Documentar copias de seguridad, restauración y borrado. No importar automáticamente los registros ficticios de localStorage.

**Aceptación:** los datos de prueba persisten tras reiniciar el servidor y pueden consultarse desde otra sesión autorizada. Ningún dato personal real se guarda en localStorage.

## 6. Conectar la captación de clientes desde la landing

- [x] Añadir formulario de solicitud de información: floristería, localidad, teléfono o email y mensaje opcional. Recoger solo los datos necesarios.
- [x] Identificar las solicitudes como origen web y estado nuevo en el panel; mantener el origen manual para las altas internas.
- [x] Validar en cliente y servidor; añadir límites de peticiones y protección contra envíos automáticos y duplicados accidentales.
- [x] Mostrar éxito solo después de guardar realmente; ante fallo, explicar el problema y conservar el contenido para reintentar.
- [x] No enviar emails ni comunicaciones comerciales automáticamente. Cualquier integración de notificaciones se tratará como una tarea posterior.

**Aceptación:** un envío válido aparece en el panel privado; uno inválido se rechaza y un fallo del servidor nunca produce un falso mensaje de éxito.

## 7. Preparar privacidad y tratamiento de datos

- [ ] Recopilar con la propietaria los datos necesarios para el aviso legal y la información de privacidad del formulario; marcar los borradores pendientes de revisión.
- [ ] Definir finalidad, acceso, conservación y procedimiento para corregir o eliminar contactos.
- [x] Separar una solicitud de información de una eventual autorización para marketing. No añadir casillas premarcadas ni suscripciones implícitas.
- [x] Activar la recogida de datos reales únicamente cuando estén completos los requisitos de acceso, persistencia e información de privacidad.

**Aceptación:** la información aplicable está disponible junto al formulario antes de captar datos reales. No se presentan textos legales generados como revisados por un profesional.

## 8. Verificar y entregar

- [x] Añadir pruebas de acceso anónimo rechazado, sesiones, validación de servidor, persistencia y operaciones de contactos.
- [x] Probar el recorrido completo: solicitud pública → nuevo contacto → seguimiento → cambio de estado → borrado.
- [x] Revisar formularios y filtros con teclado, etiquetas, foco, mensajes accesibles y pantallas móviles.
- [x] Revisar metadatos públicos y exclusión del panel de buscadores; no considerar `noindex` una medida de seguridad.
- [x] Ejecutar los comandos del proyecto y las verificaciones de Stageshow. Informar de lo que no haya podido comprobarse.
- [x] Actualizar `README.md`, `AGENTS.md` y este archivo para reflejar la implementación real, configuración, pruebas y pendientes.
- [x] Entregar la versión local revisable y documentar los pasos para un futuro despliegue, sin publicarla.

**Aceptación:** pruebas pertinentes correctas, documentación coherente con el código y una lista explícita de los datos o decisiones que aún bloqueen producción.

## Orden de trabajo

Empezar por 1. Continuar con 4 y 5 antes de conectar 6. Trabajar 2 y 7 cuando se disponga de los datos de la propietaria; mientras tanto, usar exclusivamente datos ficticios. La demo de 3 es independiente del backend y no debe retrasar las funciones del panel. Terminar con 8.
