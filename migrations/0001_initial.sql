PRAGMA foreign_keys = ON;

CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, paid_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);
CREATE TABLE reports (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 100), report_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX reports_user_created_idx ON reports(user_id, created_at DESC);
CREATE TABLE stripe_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, processed_at TEXT NOT NULL DEFAULT (datetime('now')));
