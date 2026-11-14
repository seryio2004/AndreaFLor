# Arquitectura

Decisión tomada el 14/11/2026 al pasar del prototipo con localStorage a un panel protegido.

## Requisitos que la condicionan

- Una sola usuaria (la propietaria) y un volumen pequeño: decenas o cientos de contactos.
- Datos personales de contacto profesional: deben estar protegidos, ser revocables y poder copiarse y borrarse.
- El proyecto ya funcionaba sin dependencias, con Node.js 22. No se pide escalar ni tener varias instancias.

## Decisión

| Pieza | Elección | Motivo |
|---|---|---|
| Servidor | `node:http` sin framework (`src/app.mjs`) | Unas diez rutas; Express no aportaría nada que justifique una dependencia. |
| Base de datos | SQLite con `node:sqlite` (`src/db.mjs`) | Un archivo, sin servicio aparte, copia trivial. Incluido en Node 22.13+, sin compilación nativa. |
| Migraciones | Archivos `migrations/NNN_nombre.sql`, aplicadas al arrancar y registradas en `schema_migrations` | Reproducible y revisable, sin herramienta externa. |
| Autenticación | Usuario y contraseña (scrypt) creados por terminal; sesiones en la base | Revocables al cerrar sesión o cambiar contraseña; sin registro público. |
| Protección de escrituras | Cookie `SameSite=Strict` + token CSRF + `Origin` | Tres capas independientes y baratas. |
| Validación | `public/shared/validation.js`, usada en navegador y servidor, más `CHECK` en SQL | Mismas reglas en ambos lados; el servidor nunca confía en el cliente. |
| Interfaz | HTML, CSS y módulos JS sin compilación (se mantiene la base) | Funcionaba bien; solo se cambió el almacenamiento por llamadas a la API. |

### Riesgo asumido

`node:sqlite` está marcado como experimental en Node 22 (estabilidad 1.1). Mitigación: todo el SQL vive en `src/db.mjs`, `src/auth.mjs` y `src/leads-repo.mjs`, con API síncrona equivalente a `better-sqlite3`. Si una versión de Node lo rompe, el cambio a `better-sqlite3` afecta a esos tres archivos. Pasar a PostgreSQL solo tendría sentido con varias instancias o varios usuarios concurrentes.

## Mapa de rutas

| Ruta | Acceso |
|---|---|
| `/`, `/privacidad/`, `/styles.css`, `/shared/*`, `/robots.txt` | Público |
| `/acceso/` | Público (redirige a `/admin/` con sesión) |
| `/admin/*` | Solo con sesión; si no, redirección 303 a `/acceso/` |
| `GET /api/public/form` | Público: modo del formulario |
| `POST /api/public/requests` | Público, con límite, campo trampa, origen y clave de idempotencia |
| `GET/POST/DELETE /api/session` | Consultar, iniciar y cerrar sesión |
| `GET/POST /api/leads`, `GET/PUT/DELETE /api/leads/:id` | Solo con sesión; escrituras con CSRF |

## Camino a producción

1. Completar los datos de `docs/pendientes.md` (datos comerciales y de privacidad).
2. Elegir alojamiento con disco persistente (un VPS pequeño o un servicio con volumen); SQLite no sirve en plataformas sin disco persistente.
3. Poner delante un proxy con HTTPS (Caddy o nginx) y arrancar con `NODE_ENV=production TRUST_PROXY=true`.
4. Crear la cuenta con `npm run owner -- <usuario>` en el servidor.
5. Programar `npm run db:backup` diario y copiar las copias fuera del servidor (ver `docs/operacion.md`).
6. Revisar el aviso de privacidad con un profesional; solo entonces `PUBLIC_FORM=live` y `PRIVACY_NOTICE_APPROVED=yes`.

Nada de esto se ha contratado ni publicado.
