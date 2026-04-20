import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import { sheetSyncRunsSchemaSql, sheetSyncRunsTable } from "../schema/sheetSyncRuns";
import type { SyncValidationInput, SyncValidationIssue, SyncValidationSummary } from "../../modules/sync/sync.types";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface SyncRunRecord {
  id: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  summary: SyncValidationSummary;
  input: SyncValidationInput | null;
  issues: SyncValidationIssue[];
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(sheetSyncRunsSchemaSql);
  return db;
};

export class SyncRepository {
  createRun(id: string, startedAt: string, input: SyncValidationInput): void {
    const db = openDatabase();

    try {
      db.prepare(
        `INSERT INTO ${sheetSyncRunsTable} (id, started_at, status, input_json)
         VALUES (?, ?, ?, ?)`
      ).run(id, startedAt, "RUNNING", JSON.stringify(input));
    } finally {
      db.close();
    }
  }

  completeRun(id: string, finishedAt: string, summary: SyncValidationSummary, issues: SyncValidationIssue[]): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${sheetSyncRunsTable}
         SET finished_at = ?,
             status = ?,
             rows_read_total = ?,
             rows_valid_total = ?,
             rows_invalid_total = ?,
             rows_duplicate_total = ?,
             issues_json = ?
         WHERE id = ?`
      ).run(
        finishedAt,
        "COMPLETED",
        summary.totalRows,
        summary.validRows,
        summary.invalidRows,
        summary.duplicateRows,
        JSON.stringify(issues),
        id
      );
    } finally {
      db.close();
    }
  }

  failRun(id: string, finishedAt: string, issue: string): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${sheetSyncRunsTable}
         SET finished_at = ?, status = ?, issues_json = ?
         WHERE id = ?`
      ).run(finishedAt, "FAILED", JSON.stringify([{ rowNumber: 0, reason: issue }]), id);
    } finally {
      db.close();
    }
  }

  getLatestRun(): SyncRunRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT id, started_at, finished_at, status,
                  rows_read_total, rows_valid_total, rows_invalid_total, rows_duplicate_total,
                  input_json, issues_json
           FROM ${sheetSyncRunsTable}
           ORDER BY started_at DESC
           LIMIT 1`
        )
        .get() as
        | {
            id: string;
            started_at: string;
            finished_at: string | null;
            status: string;
            rows_read_total: number;
            rows_valid_total: number;
            rows_invalid_total: number;
            rows_duplicate_total: number;
            input_json: string | null;
            issues_json: string | null;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        status: row.status,
        summary: {
          totalRows: row.rows_read_total,
          validRows: row.rows_valid_total,
          invalidRows: row.rows_invalid_total,
          duplicateRows: row.rows_duplicate_total
        },
        input: row.input_json ? (JSON.parse(row.input_json) as SyncValidationInput) : null,
        issues: row.issues_json ? (JSON.parse(row.issues_json) as SyncValidationIssue[]) : []
      };
    } finally {
      db.close();
    }
  }
}
