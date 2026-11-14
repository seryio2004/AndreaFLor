# Revisión del progreso de Claude

Fecha: 14 de noviembre de 2026. Revisión estática de los archivos disponibles durante esta sesión. No se ha modificado código, arrancado el servidor, ejecutado pruebas ni consultado o alterado la base de datos. Este documento es el único archivo creado por la revisión. Si Claude sigue trabajando, algunos hallazgos pueden quedar resueltos después de esta lectura.

## Progreso observado

La versión declarada es 0.2.0. Hay implementación de SQLite y migraciones, autenticación con contraseñas derivadas mediante scrypt, sesiones de servidor con caducidad, cookie HttpOnly, token CSRF, API de contactos, formulario público con modos off/test/live y detección de posibles duplicados. El panel consulta la API en lugar de localStorage. Existe un script de copia de seguridad.

Se han añadido pruebas de autorización, sesiones, validación, CRUD, persistencia y recorrido de captación. Su presencia está comprobada; su ejecución y resultado actuales no se han verificado en esta revisión. Stageshow continúa pendiente de integración en los archivos examinados.

## Hallazgos y correcciones

### 1. Alta prioridad: el límite de acceso se puede superar con peticiones simultáneas

**Evidencia:** `src/app.mjs`, POST `/api/session`, comprueba `loginByIp.blocked` y `loginByUser.blocked`, espera a `auth.login` y solo después incrementa los contadores de fallos. `src/auth.mjs` realiza scrypt de forma asíncrona.

**Consecuencia:** varias peticiones concurrentes pasan la comprobación antes de que termine la primera verificación. El límite secuencial probado no limita ese conjunto de intentos ni el trabajo criptográfico acumulado.

**Tarea:** reservar capacidad antes de verificar la contraseña y limitar verificaciones en curso. Añadir una prueba concurrente que compruebe que el exceso obtiene 429 sin ejecutar todas las verificaciones. Mantener la protección por cuenta e IP.

### 2. Prioridad media: un reintento con contenido cambiado puede confirmar datos que no se han guardado

**Evidencia:** `public/request.js` conserva `requestKey` tras un error de red. `src/leads-repo.mjs`, `createFromWeb`, devuelve el registro existente para esa clave sin comparar el contenido.

**Reproducción propuesta:** guardar una solicitud pero perder la respuesta; cambiar el teléfono o mensaje y reenviar. El servidor responde 200 por la clave anterior; la interfaz borra el formulario y confirma éxito aunque conserve el contenido original.

**Tarea:** vincular la clave a un contenido concreto. Si llega otra carga con la misma clave, responder con conflicto explícito o gestionar una nueva solicitud deliberadamente. Probar tanto el reintento idéntico como el modificado.

### 3. Prioridad media: mensaje falso de ausencia de cambios ante fallo de red

**Evidencia:** `public/admin/app.js`, función `api`, transforma cualquier rechazo de fetch en «No se ha guardado ningún cambio».

**Consecuencia:** una respuesta perdida después del commit puede producir ese mensaje aunque el alta, edición o borrado ya esté aplicado. Reintentar un alta manual puede duplicar el contacto, pues no tiene clave de idempotencia.

**Tarea:** comunicar resultado desconocido y ofrecer recarga para comprobarlo. Incorporar idempotencia al alta manual o una recuperación equivalente. Probar pérdida de respuesta posterior al guardado.

### 4. Prioridad media: se puede cambiar de editor durante un guardado

**Evidencia:** `public/admin/app.js`, `setBusy`, bloquea Guardar, Cancelar y Eliminar, pero deja activos Añadir contacto y los botones Editar de las filas. `open` no comprueba `busy`.

**Consecuencia:** mientras una petición está pendiente se puede abrir otro contacto y escribir; al finalizar la primera operación, `close()` cierra el editor nuevo y se pierden sus cambios sin guardar.

**Tarea:** impedir cambios de editor durante operaciones pendientes o asociar la finalización a la instancia del editor que inició la petición. Verificar con respuesta de servidor retardada.

### 5. Prioridad media: control de ediciones simultáneas incompleto

**Evidencia:** `src/app.mjs` solo rechaza conflictos si el cuerpo contiene un `updatedAt` verdadero. `src/leads-repo.mjs` usa la fecha con precisión de milisegundos como versión.

**Consecuencia:** un cliente que omita la fecha puede sobrescribir datos sin conflicto; dos escrituras con igual fecha tampoco quedan diferenciadas. La prueba existente utiliza una fecha artificial antigua, no dos editores sobre la misma versión.

**Tarea:** exigir una versión de registro y actualizarla atómicamente al guardar, preferiblemente mediante un contador. Probar dos editores sobre la misma versión y una petición sin versión.

### 6. Prioridad baja: una cookie mal formada provoca error interno

**Evidencia:** `src/app.mjs`, `cookies`, aplica `decodeURIComponent` sin capturar errores de formato. Una cookie con un porcentaje inválido hace que una ruta que consulta sesión termine en el manejador 500.

**Tarea:** ignorar cookies inválidas o devolver una respuesta controlada de petición incorrecta. Probar que un valor mal formado no provoca un error interno ni compromete el resto de cookies válidas.

### 7. Documentación desactualizada y entregables pendientes

`AGENTS.md` sigue afirmando que no hay autenticación, backend ni captación y que los contactos se guardan en localStorage. `README.md` también describe el prototipo previo. `progress.md` referencia `docs/arquitectura.md`, que no apareció entre los archivos de la revisión. Tampoco se encontró el subproyecto `demo/` anunciado para Stageshow.

**Tarea:** actualizar la descripción técnica, instrucciones de creación de la propietaria, configuración, copias/restauración y estado de las tareas. Crear o corregir el enlace al documento de arquitectura. Distinguir trabajo implementado, probado y pendiente; no marcar Stageshow como integrado sin escena y verificación.

## Siguientes tareas, en orden

1. Corregir el límite concurrente de autenticación y añadir su prueba.
2. Resolver la idempotencia y los resultados desconocidos tras fallos de red, tanto en captación como en altas internas.
3. Corregir el cambio de editor durante peticiones y el control de versiones de contactos.
4. Manejar cookies inválidas y cubrir el caso con pruebas.
5. Ejecutar comprobaciones y pruebas en una base aislada, incluyendo los nuevos casos; conservar resultados concretos.
6. Revisar en navegador los flujos de acceso, caducidad, captación, edición, errores y móvil. La revisión estática no certifica el comportamiento visual.
7. Actualizar documentación y lista de tareas para reflejar el estado real.
8. Completar Stageshow conforme a su alcance documentado y recopilar los datos comerciales y de privacidad que aún faltan antes de activar captación real.

## Límites de esta revisión

Los problemas descritos se deducen del flujo de código, con escenarios de reproducción propuestos, no ejecutados. No se ha realizado una auditoría completa de seguridad ni comprobado despliegue, restauración de copias, configuración del entorno o contenido de registros reales. No se atribuyen resultados de pruebas actuales a los resultados antiguos de `progress.md`.
