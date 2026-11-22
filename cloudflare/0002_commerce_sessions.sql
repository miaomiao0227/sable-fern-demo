CREATE TABLE commerce_sessions (
  token_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX commerce_sessions_expiry ON commerce_sessions(expires_at);
