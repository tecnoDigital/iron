export const auditLogsTable = "audit_logs";

export const auditLogsSchemaSql = `
CREATE TABLE IF NOT EXISTS ${auditLogsTable} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
`;
