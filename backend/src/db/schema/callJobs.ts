export const callJobsTable = "call_jobs";

export const callJobsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${callJobsTable} (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  amount_decimal TEXT NOT NULL,
  state TEXT NOT NULL,
  lock_until TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;
