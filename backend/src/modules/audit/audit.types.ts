export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}
