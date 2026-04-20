import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

process.env.NODE_ENV = "test";
process.env.PORT = "3000";
process.env.SESSION_SECRET = "session-secret-test";
process.env.GOOGLE_TOKEN_ENCRYPTION_KEY = "google-token-secret-test";
const tempDir = join(process.cwd(), "tmp-tests");
const dbPath = join(tempDir, "sync-stage5.sqlite");

if (!existsSync(tempDir)) {
  mkdirSync(tempDir, { recursive: true });
}

process.env.SQLITE_DB_PATH = dbPath;
process.env.SESSION_MAX_AGE_MINUTES = "120";
process.env.SESSION_IDLE_TIMEOUT_MINUTES = "30";
process.env.ALLOWED_EMAIL_1 = "operador1@ironpay.test";
process.env.ALLOWED_EMAIL_2 = "operador2@ironpay.test";

const resetDatabase = (): void => {
  rmSync(dbPath, { force: true });
};

test("sheet sync validate summarizes valid, invalid and duplicate rows", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"],
    ["Luis", "5512345678", "800"],
    ["", "5599999999", "300"],
    ["Marta", "abc", "100"],
    ["Jose", "5588877766", "invalid"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const service = new SheetSyncService();

  const result = await service.validateSheet({
    hasHeader: true,
    mapping: {
      fullName: 0,
      phone: 1,
      amount: 2
    }
  });

  assert.deepEqual(result.summary, {
    totalRows: 5,
    validRows: 0,
    invalidRows: 5,
    duplicateRows: 2
  });

  const issueReasons = result.issues.map((issue) => issue.reason);
  assert.ok(issueReasons.includes("phone_duplicate"));
  assert.ok(issueReasons.includes("full_name_required"));
  assert.ok(issueReasons.includes("phone_invalid"));
  assert.ok(issueReasons.includes("amount_invalid"));

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});

test("sheet sync validate returns valid rows when records are clean", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"],
    ["Luis", "+525588887777", "800.00"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const service = new SheetSyncService();

  const result = await service.validateSheet({
    hasHeader: true,
    mapping: {
      fullName: 0,
      phone: 1,
      amount: 2
    }
  });

  assert.deepEqual(result.summary, {
    totalRows: 2,
    validRows: 2,
    invalidRows: 0,
    duplicateRows: 0
  });

  assert.equal(result.rows[0]?.phoneE164, "+525512345678");
  assert.equal(result.rows[1]?.phoneE164, "+525588887777");
  assert.equal(result.rows[0]?.amountDecimal, "1200.50");

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});

test("sheet sync run persists latest sync and snapshot", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"],
    ["Luis", "5588877766", "800.00"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const service = new SheetSyncService();

  const output = await service.runSyncAndBuildSnapshot({
    hasHeader: true,
    mapping: {
      fullName: 0,
      phone: 1,
      amount: 2
    }
  });

  assert.equal(output.syncRun.status, "COMPLETED");
  assert.equal(output.syncRun.summary.totalRows, 2);
  assert.equal(output.snapshot.version, 1);
  assert.equal(output.snapshot.summary.validRows, 2);

  const latestSyncRun = service.getLatestSyncRun();
  const latestSnapshot = service.getLatestSnapshot();

  assert.ok(latestSyncRun);
  assert.ok(latestSnapshot);
  assert.equal(latestSyncRun?.id, output.syncRun.id);
  assert.equal(latestSnapshot?.id, output.snapshot.id);
  assert.equal(latestSnapshot?.summary.totalRows, 2);

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});
