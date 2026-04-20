import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import { snapshotsSchemaSql, snapshotsTable } from "../schema/snapshots";
import type { SyncValidationRow, SyncValidationSummary } from "../../modules/sync/sync.types";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface SnapshotRecord {
  id: string;
  syncRunId: string;
  version: number;
  createdAt: string;
  status: string;
  rows: SyncValidationRow[];
  summary: SyncValidationSummary;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(snapshotsSchemaSql);
  return db;
};

export class SnapshotsRepository {
  save(snapshot: SnapshotRecord): void {
    const db = openDatabase();

    try {
      db.prepare(
        `INSERT INTO ${snapshotsTable} (id, sync_run_id, version, created_at, status, rows_json, summary_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        snapshot.id,
        snapshot.syncRunId,
        snapshot.version,
        snapshot.createdAt,
        snapshot.status,
        JSON.stringify(snapshot.rows),
        JSON.stringify(snapshot.summary)
      );
    } finally {
      db.close();
    }
  }

  getLatestSnapshot(): SnapshotRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT id, sync_run_id, version, created_at, status, rows_json, summary_json
           FROM ${snapshotsTable}
           ORDER BY version DESC
           LIMIT 1`
        )
        .get() as
        | {
            id: string;
            sync_run_id: string;
            version: number;
            created_at: string;
            status: string;
            rows_json: string;
            summary_json: string;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        syncRunId: row.sync_run_id,
        version: row.version,
        createdAt: row.created_at,
        status: row.status,
        rows: JSON.parse(row.rows_json) as SyncValidationRow[],
        summary: JSON.parse(row.summary_json) as SyncValidationSummary
      };
    } finally {
      db.close();
    }
  }
}
