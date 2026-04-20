import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const tempDir = join(process.cwd(), "tmp-tests");
const dbPath = join(tempDir, "campaigns-stage6.sqlite");

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

test("campaign creation generates queued call jobs from latest snapshot", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"],
    ["Luis", "5588877766", "800.00"],
    ["Marta", "abc", "100"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const { CampaignService } = await import("../modules/campaigns/campaign.service");

  const syncService = new SheetSyncService();
  await syncService.runSyncAndBuildSnapshot({
    hasHeader: true,
    mapping: { fullName: 0, phone: 1, amount: 2 }
  });

  const campaignService = new CampaignService();
  const created = campaignService.createFromLatestSnapshot("operador1@ironpay.test");

  assert.equal(created.campaign.status, "VALIDATED");
  assert.equal(created.campaign.contactsTotal, 2);
  assert.equal(created.jobs.queued, 2);
  assert.equal(created.jobs.inProgress, 0);

  const loaded = campaignService.getById(created.campaign.id);
  assert.ok(loaded);
  assert.equal(loaded?.campaign.id, created.campaign.id);
  assert.equal(loaded?.jobs.queued, 2);

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});

test("campaign transitions allow start, pause and resume", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const { CampaignService } = await import("../modules/campaigns/campaign.service");

  const syncService = new SheetSyncService();
  await syncService.runSyncAndBuildSnapshot({
    hasHeader: true,
    mapping: { fullName: 0, phone: 1, amount: 2 }
  });

  const campaignService = new CampaignService();
  const created = campaignService.createFromLatestSnapshot("operador2@ironpay.test");

  const started = campaignService.transition(created.campaign.id, "RUNNING");
  assert.equal(started.campaign.status, "RUNNING");

  const paused = campaignService.transition(created.campaign.id, "PAUSED");
  assert.equal(paused.campaign.status, "PAUSED");

  const resumed = campaignService.transition(created.campaign.id, "RUNNING");
  assert.equal(resumed.campaign.status, "RUNNING");

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});
