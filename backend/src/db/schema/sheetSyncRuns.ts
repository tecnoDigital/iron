export const sheetSyncRunsTable = "sheet_sync_runs";

export const sheetSyncRunsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${sheetSyncRunsTable} (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  rows_read_total INTEGER NOT NULL DEFAULT 0,
  rows_valid_total INTEGER NOT NULL DEFAULT 0,
  rows_invalid_total INTEGER NOT NULL DEFAULT 0,
  rows_duplicate_total INTEGER NOT NULL DEFAULT 0,
  input_json TEXT,
  issues_json TEXT
);
`;
