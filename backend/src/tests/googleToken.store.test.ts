import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";

const tempDir = join(process.cwd(), "tmp-tests");
const dbPath = join(tempDir, "google-token-regression.sqlite");

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.SESSION_SECRET = "session-secret-test";
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "google-token-secret-test";
process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_MAX_AGE_MINUTES = "120";
process.env.SESSION_IDLE_TIMEOUT_MINUTES = "30";
process.env.ALLOWED_EMAIL_1 = "operador1@ironpay.test";
process.env.ALLOWED_EMAIL_2 = "operador2@ironpay.test";

const resetDatabase = (): void => {
  rmSync(dbPath, { force: true });
};

test("google token store persists snapshot in SQLite", async () => {
  resetDatabase();

  const { saveGoogleTokenSnapshot, loadGoogleTokenSnapshot } = await import(
    "../modules/google/googleToken.store"
  );

  saveGoogleTokenSnapshot({
    refreshToken: "refresh-token-123",
    accessToken: "access-token-abc",
    expiryDate: 1720000000000,
    scope: "openid email",
    updatedAt: "2026-03-27T00:00:00.000Z"
  });

  const snapshot = loadGoogleTokenSnapshot();

  assert.deepEqual(snapshot, {
    refreshToken: "refresh-token-123",
    accessToken: "access-token-abc",
    expiryDate: 1720000000000,
    scope: "openid email",
    updatedAt: "2026-03-27T00:00:00.000Z"
  });

  const db = new DatabaseSync(dbPath);
  const row = db
    .prepare("SELECT refresh_token_encrypted FROM google_tokens WHERE id = 1")
    .get() as { refresh_token_encrypted: string };
  db.close();

  assert.ok(row.refresh_token_encrypted);
  assert.notEqual(row.refresh_token_encrypted, "refresh-token-123");
});

test("google auth service keeps previous refresh token", async () => {
  resetDatabase();

  const { saveGoogleTokenSnapshot, loadGoogleTokenSnapshot } = await import(
    "../modules/google/googleToken.store"
  );
  const { GoogleAuthService } = await import("../modules/google/googleAuth.service");

  saveGoogleTokenSnapshot({
    refreshToken: "existing-refresh",
    accessToken: "old-access",
    expiryDate: 100,
    scope: "openid",
    updatedAt: "2026-03-27T00:00:00.000Z"
  });

  const service = new GoogleAuthService();
  service.saveTokens({
    access_token: "new-access",
    expiry_date: 200,
    scope: "openid email"
  });

  const snapshot = loadGoogleTokenSnapshot();

  assert.equal(snapshot?.refreshToken, "existing-refresh");
  assert.equal(snapshot?.accessToken, "new-access");
  assert.equal(snapshot?.expiryDate, 200);
  assert.equal(snapshot?.scope, "openid email");
});
