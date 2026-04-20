import { CallJobsRepository } from "../../db/repositories/callJobs.repository";
import { CampaignsRepository } from "../../db/repositories/campaigns.repository";
import { SnapshotsRepository } from "../../db/repositories/snapshots.repository";
import { buildId } from "../../utils/ids";
import { canTransitionCampaignState, type CampaignState } from "./campaign.stateMachine";
import type { CampaignWithJobs } from "./campaign.types";

const DEFAULT_STARTED_BY = "system";

export class CampaignService {
  private snapshotsRepository = new SnapshotsRepository();
  private campaignsRepository = new CampaignsRepository();
  private callJobsRepository = new CallJobsRepository();

  createFromLatestSnapshot(startedBy?: string): CampaignWithJobs {
    const snapshot = this.snapshotsRepository.getLatestSnapshot();

    if (!snapshot) {
      throw new Error("snapshot_not_found");
    }

    const validRows = snapshot.rows.filter((row) => row.isValid && row.phoneE164 && row.amountDecimal);
    if (validRows.length === 0) {
      throw new Error("snapshot_not_eligible");
    }

    const campaign = this.campaignsRepository.create({
      id: buildId(),
      snapshotId: snapshot.id,
      startedBy: (startedBy ?? DEFAULT_STARTED_BY).trim() || DEFAULT_STARTED_BY,
      status: "VALIDATED",
      startedAt: new Date().toISOString(),
      contactsTotal: validRows.length,
      contactsQueued: validRows.length
    });

    const jobs = this.callJobsRepository.createFromSnapshotRows(campaign.id, snapshot.rows);

    return {
      campaign,
      jobs: {
        queued: jobs.length,
        inProgress: 0,
        completed: 0,
        failed: 0
      }
    };
  }

  getById(campaignId: string): CampaignWithJobs | null {
    const campaign = this.campaignsRepository.getById(campaignId);
    if (!campaign) {
      return null;
    }

    return {
      campaign,
      jobs: this.callJobsRepository.getStateCounts(campaign.id)
    };
  }

  getLatest(): CampaignWithJobs | null {
    const campaign = this.campaignsRepository.getLatest();
    if (!campaign) {
      return null;
    }

    return {
      campaign,
      jobs: this.callJobsRepository.getStateCounts(campaign.id)
    };
  }

  transition(campaignId: string, nextState: CampaignState): CampaignWithJobs {
    const current = this.campaignsRepository.getById(campaignId);
    if (!current) {
      throw new Error("campaign_not_found");
    }

    if (!canTransitionCampaignState(current.status, nextState)) {
      throw new Error("campaign_transition_invalid");
    }

    const updated = this.campaignsRepository.updateStatus(campaignId, nextState);
    if (!updated) {
      throw new Error("campaign_not_found");
    }

    return {
      campaign: updated,
      jobs: this.callJobsRepository.getStateCounts(campaignId)
    };
  }
}
