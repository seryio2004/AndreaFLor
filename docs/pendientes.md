# Datos y decisiones pendientes de la propietaria

Lista única de lo que no se puede completar sin información confirmada. Nada de esto se ha inventado; mientras falte, la web lo muestra como pendiente y el formulario real no puede activarse.

## Datos comerciales (tarea 2)

| Dato | Dónde se usa | Estado |
|---|---|---|
| Nombre comercial | `public/config.js` → cabecera, título, pie | Pendiente |
| Teléfono (formato +34 …) | `public/config.js` → enlace `tel:` | Pendiente |
| Correo electrónico | `public/config.js` → enlace `mailto:` | Pendiente |
| Titular: nombre o razón social y NIF | Aviso legal, privacidad | Pendiente |
| Dirección aplicable (domicilio fiscal o almacén) | Aviso legal, privacidad | Pendiente |
| Localidades atendidas dentro del área de Vigo y Ourense | Sección «Zona de reparto» | Pendiente: solo está confirmado «área de Vigo y Ourense» |
| Días u horarios de reparto | Sección «Reparto» | Pendiente (no se afirma entrega diaria) |
| Pedido mínimo, forma de pedido, condiciones de pago | Servicios | Pendiente |
| Productos destacados: clavel de Holanda, orquídeas de Colombia y margarita portuguesa | Sección «Productos» | Indicados por el usuario el 14/11/2026; **confirmar con la propietaria**. Los textos solo describen cada flor y su país de origen; variedades, stock y precios no se afirman |
| Fotografías propias (instalaciones, producto, vehículos) | Portada, productos, mosaico, reparto | Pendiente: ahora hay fotos genéricas CC0 marcadas como ilustrativas (`public/img/fotos/CREDITOS.md`) |

Al recibir cada dato: escribirlo en `public/config.js` o en el texto correspondiente; los enlaces `tel:` y `mailto:` aparecen solos cuando el formato es válido.

## Privacidad y tratamiento de datos (tarea 7)

Propuesta de trabajo para decidir con la propietaria. **No es asesoramiento jurídico** y debe revisarlo un profesional.

| Cuestión | Propuesta | Decisión |
|---|---|---|
| Finalidad | Responder solicitudes de información de floristerías y gestionar la relación comercial que surja | Pendiente |
| Datos recogidos | Floristería, localidad, zona, teléfono o correo, mensaje opcional (ya limitado en el código) | Implementado |
| Acceso | Solo la propietaria, con su cuenta del panel | Implementado |
| Conservación | Solicitudes sin respuesta o descartadas: borrar a los 12 meses. Clientes: mientras dure la relación y los plazos legales aplicables. Copias de seguridad: 30 días | Pendiente |
| Corrección y supresión | La propietaria edita o elimina desde el panel; ver `docs/operacion.md` para las copias | Implementado (procedimiento) |
| Marketing | No hay casilla ni suscripción. Una autorización para comunicaciones comerciales sería un consentimiento aparte, no marcado por defecto, y una tarea posterior | Sin implementar a propósito |
| Alojamiento y encargados | Proveedor del servidor y su ubicación | Pendiente |
| Aviso legal (LSSI) | Requiere los datos de la titular | Pendiente |

`public/privacidad/index.html` contiene un **borrador** con los huecos marcados. No debe publicarse sin completarlo y revisarlo.

## Condición para recoger datos reales

`PUBLIC_FORM=live` solo arranca si están el nombre comercial, un teléfono o correo, HTTPS y `PRIVACY_NOTICE_APPROVED=yes`. Esa última variable solo debe ponerse cuando el aviso esté completo y revisado.
