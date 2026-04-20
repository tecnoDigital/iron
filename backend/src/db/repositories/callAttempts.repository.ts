import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import { buildId } from "../../utils/ids";
import { callAttemptsSchemaSql, callAttemptsTable } from "../schema/callAttempts";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface CallAttemptRecord {
  id: string;
  callJobId: string;
  provider: string;
  providerCallId: string | null;
  status: "DIALING" | "IN_PROGRESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  rawResponseJson: string | null;
  errorMessage: string | null;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(callAttemptsSchemaSql);
  return db;
};

const mapRow = (row: {
  id: string;
  call_job_id: string;
  provider: string;
  provider_call_id: string | null;
  status: "DIALING" | "IN_PROGRESS" | "FAILED";
  started_at: string;
  finished_at: string | null;
  raw_response_json: string | null;
  error_message: string | null;
}): CallAttemptRecord => ({
  id: row.id,
  callJobId: row.call_job_id,
  provider: row.provider,
  providerCallId: row.provider_call_id,
  status: row.status,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  rawResponseJson: row.raw_response_json,
  errorMessage: row.error_message
});

export class CallAttemptsRepository {
  createDialing(callJobId: string, provider: string): CallAttemptRecord {
    const db = openDatabase();
    const now = new Date().toISOString();
    const attempt: CallAttemptRecord = {
      id: buildId(),
      callJobId,
      provider,
      providerCallId: null,
      status: "DIALING",
      startedAt: now,
      finishedAt: null,
      rawResponseJson: null,
      errorMessage: null
    };

    try {
      db.prepare(
        `INSERT INTO ${callAttemptsTable} (id, call_job_id, provider, provider_call_id, status, started_at, finished_at, raw_response_json, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        attempt.id,
        attempt.callJobId,
        attempt.provider,
        attempt.providerCallId,
        attempt.status,
        attempt.startedAt,
        attempt.finishedAt,
        attempt.rawResponseJson,
        attempt.errorMessage
      );

      return attempt;
    } finally {
      db.close();
    }
  }

  markInProgress(attemptId: string, providerCallId: string, rawResponse: unknown): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${callAttemptsTable}
         SET provider_call_id = ?, status = ?, raw_response_json = ?
         WHERE id = ?`
      ).run(providerCallId, "IN_PROGRESS", JSON.stringify(rawResponse), attemptId);
    } finally {
      db.close();
    }
  }

  markFailed(attemptId: string, errorMessage: string): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${callAttemptsTable}
         SET status = ?, finished_at = ?, error_message = ?
         WHERE id = ?`
      ).run("FAILED", new Date().toISOString(), errorMessage, attemptId);
    } finally {
      db.close();
    }
  }

  getByCallJobId(callJobId: string): CallAttemptRecord[] {
    const db = openDatabase();

    try {
      const rows = db
        .prepare(
          `SELECT id, call_job_id, provider, provider_call_id, status, started_at, finished_at, raw_response_json, error_message
           FROM ${callAttemptsTable}
           WHERE call_job_id = ?
           ORDER BY started_at ASC, id ASC`
        )
        .all(callJobId) as Array<{
        id: string;
        call_job_id: string;
        provider: string;
        provider_call_id: string | null;
        status: "DIALING" | "IN_PROGRESS" | "FAILED";
        started_at: string;
        finished_at: string | null;
        raw_response_json: string | null;
        error_message: string | null;
      }>;

      return rows.map(mapRow);
    } finally {
      db.close();
    }
  }
}
