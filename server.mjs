import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { loadConfig } from './src/config.mjs';
import { openDatabase } from './src/db.mjs';
import { createApp } from './src/app.mjs';

// .env es opcional; las variables ya definidas en el entorno tienen prioridad.
if (existsSync('.env')) process.loadEnvFile('.env');

let config;
try {
  config = loadConfig();
} catch (error) {
  console.error(`Configuración no válida: ${error.message}`);
  process.exit(1);
}

const db = openDatabase(config.databasePath);
const server = createServer(createApp({ db, config }));
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;

server.listen(config.port, config.host, () => {
  console.log(`Proyecto local: http://${config.host}:${config.port}`);
  console.log(`Formulario público: ${config.publicForm}${config.publicForm === 'test' ? ' (solo datos ficticios)' : ''}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => { db.close(); process.exit(0); }));
}
