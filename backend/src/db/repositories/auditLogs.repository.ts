import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import { auditLogsSchemaSql, auditLogsTable } from "../schema/auditLogs";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface SaveAuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  metadataJson?: string;
  createdAt: string;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(auditLogsSchemaSql);
  return db;
};

export class AuditLogsRepository {
  save(input: SaveAuditLogInput): void {
    const db = openDatabase();

    try {
      db.prepare(
        `INSERT INTO ${auditLogsTable} (action, entity_type, entity_id, metadata_json, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).run(
        input.action,
        input.entityType,
        input.entityId,
        input.metadataJson ?? null,
        input.createdAt
      );
    } finally {
      db.close();
    }
  }
}
