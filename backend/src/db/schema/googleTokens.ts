export const googleTokensTable = "google_tokens";

export const googleTokensSchemaSql = `
CREATE TABLE IF NOT EXISTS ${googleTokensTable} (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  refresh_token_encrypted TEXT NOT NULL,
  access_token TEXT,
  expiry_date INTEGER,
  scope TEXT,
  updated_at TEXT NOT NULL
);
`;
