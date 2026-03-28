import { logger } from "../../config/logger";
import { AuditLogsRepository } from "../../db/repositories/auditLogs.repository";
import { buildAuditMetadata } from "./audit.helpers";
import type { AuditLogEntry } from "./audit.types";

export class AuditService {
  private auditLogsRepository = new AuditLogsRepository();

  record(entry: AuditLogEntry): void {
    try {
      this.auditLogsRepository.save({
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadataJson: entry.metadata ? buildAuditMetadata(entry.metadata) : undefined,
        createdAt: entry.createdAt ?? new Date().toISOString()
      });
    } catch (error) {
      logger.warn({ error, action: entry.action }, "Audit log persistence failed");
    }
  }
}
