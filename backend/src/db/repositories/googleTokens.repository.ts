import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

import { env } from "../../config/env";
import { googleTokensSchemaSql, googleTokensTable } from "../schema/googleTokens";

const TOKEN_ROW_ID = 1;
const DEFAULT_DB_PATH = join(process.cwd(), "data", "ironpay.sqlite");

export interface StoredGoogleTokenRecord {
  refreshTokenEncrypted: string;
  accessToken?: string;
  expiryDate?: number;
  scope?: string;
  updatedAt: string;
}

interface StoredGoogleTokenRow {
  refresh_token_encrypted: string;
  access_token: string | null;
  expiry_date: number | null;
  scope: string | null;
  updated_at: string;
}

const resolveDbPath = (): string => env.SQLITE_DB_PATH ?? DEFAULT_DB_PATH;

const openDatabase = (): DatabaseSync => {
  const dbPath = resolveDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec(googleTokensSchemaSql);
  return db;
};

export class GoogleTokensRepository {
  load(): StoredGoogleTokenRecord | null {
    const db = openDatabase();

    try {
      const row = db
        .prepare(
          `SELECT refresh_token_encrypted, access_token, expiry_date, scope, updated_at FROM ${googleTokensTable} WHERE id = ?`
        )
        .get(TOKEN_ROW_ID) as StoredGoogleTokenRow | undefined;

      if (!row) {
        return null;
      }

      return {
        refreshTokenEncrypted: row.refresh_token_encrypted,
        accessToken: row.access_token ?? undefined,
        expiryDate: row.expiry_date ?? undefined,
        scope: row.scope ?? undefined,
        updatedAt: row.updated_at
      };
    } finally {
      db.close();
    }
  }

  save(record: StoredGoogleTokenRecord): void {
    const db = openDatabase();

    try {
      db.prepare(
        `INSERT INTO ${googleTokensTable} (id, refresh_token_encrypted, access_token, expiry_date, scope, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           refresh_token_encrypted = excluded.refresh_token_encrypted,
           access_token = excluded.access_token,
           expiry_date = excluded.expiry_date,
           scope = excluded.scope,
           updated_at = excluded.updated_at`
      ).run(
        TOKEN_ROW_ID,
        record.refreshTokenEncrypted,
        record.accessToken ?? null,
        record.expiryDate ?? null,
        record.scope ?? null,
        record.updatedAt
      );
    } finally {
      db.close();
    }
  }
}
