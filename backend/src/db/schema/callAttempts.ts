export const callAttemptsTable = "call_attempts";

export const callAttemptsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${callAttemptsTable} (
  id TEXT PRIMARY KEY,
  call_job_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_call_id TEXT,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  raw_response_json TEXT,
  error_message TEXT
);
`;
