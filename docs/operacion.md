# Operación: cuenta, copias, restauración y borrado

## Cuenta de acceso

```bash
npm run owner -- propietaria        # pide la contraseña dos veces (mínimo 12 caracteres)
```

El mismo comando cambia la contraseña de una cuenta existente y **cierra todas sus sesiones abiertas** (útil si se pierde un dispositivo). No existe alta desde la web.

## Copias de seguridad

```bash
npm run db:backup                    # crea backups/flores-<fecha>.db
npm run db:backup -- /ruta/externa   # o en otra carpeta
```

Usa `VACUUM INTO`: la copia es consistente aunque el servidor esté funcionando. Recomendación para producción: una copia diaria programada (cron) y copiarla fuera del servidor. Las copias contienen datos personales: guardarlas cifradas o en un lugar con acceso restringido, y borrar las antiguas según el plazo que se decida (ver `docs/pendientes.md`).

## Restauración

1. Detener el servidor.
2. Conservar el archivo actual por si acaso: `mv data/flores.db data/flores.db.anterior` (y los `-wal`/`-shm` si existen).
3. Copiar la copia elegida: `cp backups/flores-<fecha>.db data/flores.db`.
4. Arrancar. Las migraciones pendientes se aplican solas.
5. Las sesiones guardadas en la copia pueden seguir vigentes si no han caducado; para invalidarlas, volver a ejecutar `npm run owner -- <usuario>`.

## Borrado de contactos

- Desde el panel, «Eliminar contacto» borra el registro de la base de forma definitiva tras confirmación.
- El registro sigue existiendo en las copias anteriores hasta que estas se eliminan por antigüedad. Si alguien ejerce su derecho de supresión, anotar la fecha y el identificador para no reintroducirlo al restaurar una copia antigua.
- Corrección de datos: editar el contacto desde el panel.

## Verificación local

```bash
npm run check   # sintaxis de todos los módulos
npm test        # pruebas de lógica, API, autenticación y persistencia
npm run dev     # http://127.0.0.1:3000
```
