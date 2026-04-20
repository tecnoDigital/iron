import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import type { CampaignState } from "../../modules/campaigns/campaign.stateMachine";
import { campaignsSchemaSql, campaignsTable } from "../schema/campaigns";

const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface CampaignRecord {
  id: string;
  snapshotId: string;
  startedBy: string;
  status: CampaignState;
  startedAt: string;
  finishedAt: string | null;
  contactsTotal: number;
  contactsQueued: number;
}

export interface CreateCampaignInput {
  id: string;
  snapshotId: string;
  startedBy: string;
  status: CampaignState;
  startedAt: string;
  contactsTotal: number;
  contactsQueued: number;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(campaignsSchemaSql);
  return db;
};

const mapCampaignRow = (row: {
  id: string;
  snapshot_id: string;
  started_by: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  contacts_total: number;
  contacts_queued: number;
}): CampaignRecord => ({
  id: row.id,
  snapshotId: row.snapshot_id,
  startedBy: row.started_by,
  status: row.status as CampaignState,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  contactsTotal: row.contacts_total,
  contactsQueued: row.contacts_queued
});

export class CampaignsRepository {
  create(input: CreateCampaignInput): CampaignRecord {
    const db = openDatabase();

    try {
      db.prepare(
        `INSERT INTO ${campaignsTable} (id, snapshot_id, started_by, status, started_at, contacts_total, contacts_queued)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        input.id,
        input.snapshotId,
        input.startedBy,
        input.status,
        input.startedAt,
        input.contactsTotal,
        input.contactsQueued
      );

      return {
        id: input.id,
        snapshotId: input.snapshotId,
        startedBy: input.startedBy,
        status: input.status,
        startedAt: input.startedAt,
        finishedAt: null,
        contactsTotal: input.contactsTotal,
        contactsQueued: input.contactsQueued
      };
    } finally {
      db.close();
    }
  }

  getById(id: string): CampaignRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT id, snapshot_id, started_by, status, started_at, finished_at, contacts_total, contacts_queued
           FROM ${campaignsTable}
           WHERE id = ?`
        )
        .get(id) as
        | {
            id: string;
            snapshot_id: string;
            started_by: string;
            status: string;
            started_at: string;
            finished_at: string | null;
            contacts_total: number;
            contacts_queued: number;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return mapCampaignRow(row);
    } finally {
      db.close();
    }
  }

  getLatest(): CampaignRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT id, snapshot_id, started_by, status, started_at, finished_at, contacts_total, contacts_queued
           FROM ${campaignsTable}
           ORDER BY started_at DESC
           LIMIT 1`
        )
        .get() as
        | {
            id: string;
            snapshot_id: string;
            started_by: string;
            status: string;
            started_at: string;
            finished_at: string | null;
            contacts_total: number;
            contacts_queued: number;
          }
        | undefined;

      if (!row) {
        return null;
      }

      return mapCampaignRow(row);
    } finally {
      db.close();
    }
  }

  updateStatus(id: string, status: CampaignState): CampaignRecord | null {
    const db = openDatabase();

    try {
      const isFinal = status === "COMPLETED" || status === "FAILED";
      db.prepare(
        `UPDATE ${campaignsTable}
         SET status = ?, finished_at = ?
         WHERE id = ?`
      ).run(status, isFinal ? new Date().toISOString() : null, id);

      const updated = this.getById(id);
      return updated;
    } finally {
      db.close();
    }
  }
}
