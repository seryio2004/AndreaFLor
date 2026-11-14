-- Usuarios del panel (sin registro público: se crean con `npm run owner:create`).
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sesiones de servidor. Solo se guarda el hash SHA-256 del token de la cookie.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX sessions_user ON sessions(user_id);

-- Contactos comerciales (posibles clientes).
CREATE TABLE leads (
  id TEXT PRIMARY KEY,
  business TEXT NOT NULL CHECK (length(business) BETWEEN 1 AND 120),
  contact_name TEXT NOT NULL DEFAULT '' CHECK (length(contact_name) <= 120),
  town TEXT NOT NULL CHECK (length(town) BETWEEN 1 AND 100),
  area TEXT NOT NULL CHECK (area IN ('Vigo', 'Ourense')),
  phone TEXT NOT NULL DEFAULT '' CHECK (length(phone) <= 30),
  phone_key TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '' CHECK (length(email) <= 160),
  source TEXT NOT NULL CHECK (source IN ('manual', 'web')),
  status TEXT NOT NULL CHECK (status IN ('nuevo', 'contactado', 'interesado', 'cliente', 'descartado')),
  message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 1000),
  notes TEXT NOT NULL DEFAULT '' CHECK (length(notes) <= 2000),
  next_action TEXT NOT NULL DEFAULT '' CHECK (length(next_action) <= 200),
  follow_up TEXT,
  request_key TEXT UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (phone <> '' OR email <> '')
);
CREATE INDEX leads_email ON leads(email) WHERE email <> '';
CREATE INDEX leads_phone_key ON leads(phone_key) WHERE phone_key <> '';
CREATE INDEX leads_created ON leads(created_at);
