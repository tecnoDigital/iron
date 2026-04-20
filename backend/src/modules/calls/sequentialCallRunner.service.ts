import { CampaignsRepository } from "../../db/repositories/campaigns.repository";
import type { CallProvider } from "../../providers/callProvider.interface";
import { RetellProvider } from "../../providers/retell.provider";
import type { CallRunnerResult } from "./calls.types";
import { CallAttemptService } from "./callAttempt.service";
import { CallJobService } from "./callJob.service";

const LOCK_TTL_MS = 60_000;
const PROVIDER_NAME = "retell";

export class SequentialCallRunnerService {
  private campaignsRepository = new CampaignsRepository();
  private callJobService = new CallJobService();
  private callAttemptService = new CallAttemptService();

  constructor(private callProvider: CallProvider = new RetellProvider()) {}

  async runOnce(): Promise<CallRunnerResult> {
    const campaign = this.campaignsRepository.getLatest();

    if (!campaign) {
      return { processed: false, reason: "no_campaign" };
    }

    if (campaign.status !== "RUNNING") {
      return {
        processed: false,
        reason: "campaign_not_running",
        campaignId: campaign.id
      };
    }

    const nextJob = this.callJobService.getNextQueued(campaign.id);
    if (!nextJob) {
      return {
        processed: false,
        reason: "no_queued_jobs",
        campaignId: campaign.id
      };
    }

    const lockUntil = new Date(Date.now() + LOCK_TTL_MS).toISOString();
    this.callJobService.lock(nextJob.id, lockUntil);

    const { attemptId } = this.callAttemptService.startDialing(nextJob.id, PROVIDER_NAME);

    try {
      const providerResponse = await this.callProvider.createCall({
        campaignId: campaign.id,
        callJobId: nextJob.id,
        contactName: nextJob.contactName,
        contactPhone: nextJob.contactPhone,
        amountDecimal: nextJob.amountDecimal
      });

      this.callAttemptService.markInProgress(attemptId, providerResponse.providerCallId, providerResponse);
      this.callJobService.markInProgress(nextJob.id);

      return {
        processed: true,
        reason: "provider_dispatched",
        campaignId: campaign.id,
        jobId: nextJob.id,
        attemptId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "provider_call_failed";

      this.callAttemptService.markFailed(attemptId, errorMessage);
      this.callJobService.markFailed(nextJob.id, errorMessage);

      return {
        processed: false,
        reason: "provider_failed",
        campaignId: campaign.id,
        jobId: nextJob.id,
        attemptId
      };
    }
  }
}
