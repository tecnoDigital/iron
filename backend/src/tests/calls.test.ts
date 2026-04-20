import assert from "node:assert/strict";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { CallProvider } from "../providers/callProvider.interface";

const tempDir = join(process.cwd(), "tmp-tests");
const dbPath = join(tempDir, "calls-stage7.sqlite");

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

class SuccessProvider implements CallProvider {
  async createCall(): Promise<{ providerCallId: string }> {
    return { providerCallId: "provider_call_ok_1" };
  }
}

class FailureProvider implements CallProvider {
  async createCall(): Promise<{ providerCallId: string }> {
    throw new Error("provider_unavailable");
  }
}

test("runner dispatches one queued job and marks attempt in progress", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"],
    ["Marta", "abc", "400"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const { CampaignService } = await import("../modules/campaigns/campaign.service");
  const { SequentialCallRunnerService } = await import("../modules/calls/sequentialCallRunner.service");
  const { CallJobsRepository } = await import("../db/repositories/callJobs.repository");
  const { CallAttemptsRepository } = await import("../db/repositories/callAttempts.repository");

  const syncService = new SheetSyncService();
  await syncService.runSyncAndBuildSnapshot({
    hasHeader: true,
    mapping: { fullName: 0, phone: 1, amount: 2 }
  });

  const campaignService = new CampaignService();
  const created = campaignService.createFromLatestSnapshot("runner@test");
  campaignService.transition(created.campaign.id, "RUNNING");

  const runner = new SequentialCallRunnerService(new SuccessProvider());
  const result = await runner.runOnce();

  assert.equal(result.processed, true);
  assert.equal(result.reason, "provider_dispatched");
  assert.equal(result.campaignId, created.campaign.id);
  assert.ok(result.jobId);
  assert.ok(result.attemptId);

  const callJobsRepository = new CallJobsRepository();
  const jobs = callJobsRepository.getByCampaignId(created.campaign.id);
  assert.equal(jobs.length, 1);
  assert.equal(jobs[0]?.state, "IN_PROGRESS");

  const callAttemptsRepository = new CallAttemptsRepository();
  const attempts = callAttemptsRepository.getByCallJobId(result.jobId as string);
  assert.equal(attempts.length, 1);
  assert.equal(attempts[0]?.status, "IN_PROGRESS");
  assert.equal(attempts[0]?.providerCallId, "provider_call_ok_1");

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});

test("runner marks job and attempt as failed when provider call fails", async () => {
  resetDatabase();
  process.env.GOOGLE_SHEET_MOCK_ROWS = JSON.stringify([
    ["name", "phone", "amount"],
    ["Ana", "5512345678", "1200.50"]
  ]);

  const { SheetSyncService } = await import("../modules/sync/sheetSync.service");
  const { CampaignService } = await import("../modules/campaigns/campaign.service");
  const { SequentialCallRunnerService } = await import("../modules/calls/sequentialCallRunner.service");
  const { CallJobsRepository } = await import("../db/repositories/callJobs.repository");
  const { CallAttemptsRepository } = await import("../db/repositories/callAttempts.repository");

  const syncService = new SheetSyncService();
  await syncService.runSyncAndBuildSnapshot({
    hasHeader: true,
    mapping: { fullName: 0, phone: 1, amount: 2 }
  });

  const campaignService = new CampaignService();
  const created = campaignService.createFromLatestSnapshot("runner@test");
  campaignService.transition(created.campaign.id, "RUNNING");

  const runner = new SequentialCallRunnerService(new FailureProvider());
  const result = await runner.runOnce();

  assert.equal(result.processed, false);
  assert.equal(result.reason, "provider_failed");
  assert.ok(result.jobId);

  const callJobsRepository = new CallJobsRepository();
  const jobs = callJobsRepository.getByCampaignId(created.campaign.id);
  assert.equal(jobs[0]?.state, "COMPLETED_FAILED");
  assert.equal(jobs[0]?.lastError, "provider_unavailable");

  const callAttemptsRepository = new CallAttemptsRepository();
  const attempts = callAttemptsRepository.getByCallJobId(result.jobId as string);
  assert.equal(attempts[0]?.status, "FAILED");
  assert.equal(attempts[0]?.errorMessage, "provider_unavailable");

  delete process.env.GOOGLE_SHEET_MOCK_ROWS;
});
