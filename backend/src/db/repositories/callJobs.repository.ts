import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import type { CallJobState } from "../../modules/calls/call.stateMachine";
import type { SyncValidationRow } from "../../modules/sync/sync.types";
import { buildId } from "../../utils/ids";
import { callJobsSchemaSql, callJobsTable } from "../schema/callJobs";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface CallJobRecord {
  id: string;
  campaignId: string;
  contactName: string;
  contactPhone: string;
  amountDecimal: string;
  state: CallJobState;
  lockUntil: string | null;
  attemptCount: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CallJobStateCounts {
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(callJobsSchemaSql);
  return db;
};

const mapRow = (row: {
  id: string;
  campaign_id: string;
  contact_name: string;
  contact_phone: string;
  amount_decimal: string;
  state: string;
  lock_until: string | null;
  attempt_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}): CallJobRecord => ({
  id: row.id,
  campaignId: row.campaign_id,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  amountDecimal: row.amount_decimal,
  state: row.state as CallJobState,
  lockUntil: row.lock_until,
  attemptCount: row.attempt_count,
  lastError: row.last_error,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class CallJobsRepository {
  createFromSnapshotRows(campaignId: string, rows: SyncValidationRow[]): CallJobRecord[] {
    const validRows = rows.filter((row) => row.isValid && row.phoneE164 && row.amountDecimal);
    const createdAt = new Date().toISOString();
    const created: CallJobRecord[] = [];

    const db = openDatabase();

    try {
      const stmt = db.prepare(
        `INSERT INTO ${callJobsTable}
         (id, campaign_id, contact_name, contact_phone, amount_decimal, state, lock_until, attempt_count, last_error, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );

      for (const row of validRows) {
        const id = buildId();
        const record: CallJobRecord = {
          id,
          campaignId,
          contactName: row.fullName,
          contactPhone: row.phoneE164 as string,
          amountDecimal: row.amountDecimal as string,
          state: "QUEUED",
          lockUntil: null,
          attemptCount: 0,
          lastError: null,
          createdAt,
          updatedAt: createdAt
        };

        stmt.run(
          record.id,
          record.campaignId,
          record.contactName,
          record.contactPhone,
          record.amountDecimal,
          record.state,
          record.lockUntil,
          record.attemptCount,
          record.lastError,
          record.createdAt,
          record.updatedAt
        );
        created.push(record);
      }

      return created;
    } finally {
      db.close();
    }
  }

  getByCampaignId(campaignId: string): CallJobRecord[] {
    const db = openDatabase();

    try {
      const rows = db
        .prepare(
          `SELECT id, campaign_id, contact_name, contact_phone, amount_decimal, state, lock_until, attempt_count, last_error, created_at, updated_at
           FROM ${callJobsTable}
           WHERE campaign_id = ?
           ORDER BY created_at ASC, id ASC`
        )
        .all(campaignId) as Array<{
        id: string;
        campaign_id: string;
        contact_name: string;
        contact_phone: string;
        amount_decimal: string;
        state: string;
        lock_until: string | null;
        attempt_count: number;
        last_error: string | null;
        created_at: string;
        updated_at: string;
      }>;

      return rows.map(mapRow);
    } finally {
      db.close();
    }
  }

  getNextQueued(campaignId: string): CallJobRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT id, campaign_id, contact_name, contact_phone, amount_decimal, state, lock_until, attempt_count, last_error, created_at, updated_at
           FROM ${callJobsTable}
           WHERE campaign_id = ? AND state = 'QUEUED'
           ORDER BY created_at ASC, id ASC
           LIMIT 1`
        )
        .get(campaignId) as
        | {
            id: string;
            campaign_id: string;
            contact_name: string;
            contact_phone: string;
            amount_decimal: string;
            state: string;
            lock_until: string | null;
            attempt_count: number;
            last_error: string | null;
            created_at: string;
            updated_at: string;
          }
        | undefined;

      return row ? mapRow(row) : null;
    } finally {
      db.close();
    }
  }

  updateState(jobId: string, state: CallJobState, lastError?: string | null): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${callJobsTable}
         SET state = ?, lock_until = NULL, last_error = ?, updated_at = ?
         WHERE id = ?`
      ).run(state, lastError ?? null, new Date().toISOString(), jobId);
    } finally {
      db.close();
    }
  }

  lockJob(jobId: string, lockUntilIso: string): void {
    const db = openDatabase();

    try {
      db.prepare(
        `UPDATE ${callJobsTable}
         SET state = ?, lock_until = ?, updated_at = ?
         WHERE id = ?`
      ).run("LOCKED", lockUntilIso, new Date().toISOString(), jobId);
    } finally {
      db.close();
    }
  }

  getStateCounts(campaignId: string): CallJobStateCounts {
    const jobs = this.getByCampaignId(campaignId);

    return jobs.reduce<CallJobStateCounts>(
      (acc, job) => {
        if (job.state === "QUEUED") {
          acc.queued += 1;
        } else if (job.state === "LOCKED" || job.state === "DIALING" || job.state === "IN_PROGRESS") {
          acc.inProgress += 1;
        } else if (
          job.state === "COMPLETED_SUCCESS" ||
          job.state === "COMPLETED_NO_ANSWER" ||
          job.state === "CANCELLED"
        ) {
          acc.completed += 1;
        } else if (job.state === "COMPLETED_FAILED" || job.state === "NEEDS_RETRY") {
          acc.failed += 1;
        }

        return acc;
      },
      { queued: 0, inProgress: 0, completed: 0, failed: 0 }
    );
  }
}
