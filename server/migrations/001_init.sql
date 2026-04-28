-- MEMORISE Curation Platform — initial Postgres schema.
-- Mirrors the entity set persisted by JsonFileAdapter (users.json, workspaces.json, config.json).
-- Idempotent: PostgresAdapter also runs equivalent CREATE TABLE IF NOT EXISTS at boot,
-- so this file primarily serves the docker-entrypoint-initdb.d hook on first container start.

CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  email           TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspaces (
  id              TEXT PRIMARY KEY,
  owner_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  is_temporary    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      BIGINT,
  data            JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

CREATE TABLE IF NOT EXISTS endpoint_config (
  key             TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  url             TEXT NOT NULL,
  adapter         TEXT
);
