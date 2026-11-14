// Acceso a SQLite mediante node:sqlite (incluido en Node.js 22). Todo el SQL del proyecto pasa por este módulo
// y por los repositorios que lo usan, para poder sustituir el motor sin tocar las rutas HTTP.
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

export function openDatabase(file) {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  if (file !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  migrate(db);
  return db;
}

export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)');
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map(row => row.version));
  const files = readdirSync(migrationsDir).filter(name => /^\d{3}_[\w-]+\.sql$/.test(name)).sort();
  for (const name of files) {
    if (applied.has(name)) continue;
    transaction(db, () => {
      db.exec(readFileSync(path.join(migrationsDir, name), 'utf8'));
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(name, new Date().toISOString());
    });
  }
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
