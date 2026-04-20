export const snapshotsTable = "snapshots";

export const snapshotsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${snapshotsTable} (
  id TEXT PRIMARY KEY,
  sync_run_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL,
  rows_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  UNIQUE(version)
);
`;
