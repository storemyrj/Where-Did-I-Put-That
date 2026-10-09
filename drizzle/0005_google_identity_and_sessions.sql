-- Google identity linked to existing app user IDs. Do not rewrite any item ownership.
CREATE TABLE IF NOT EXISTS google_identities (
  google_sub TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  given_name TEXT,
  picture_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS google_identities_user_id ON google_identities(user_id);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  google_sub TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_sessions_google_sub ON auth_sessions(google_sub);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at ON auth_sessions(expires_at);
