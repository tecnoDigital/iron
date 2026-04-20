export const campaignsTable = "campaigns";

export const campaignsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${campaignsTable} (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  started_by TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  contacts_total INTEGER NOT NULL DEFAULT 0,
  contacts_queued INTEGER NOT NULL DEFAULT 0
);
`;
