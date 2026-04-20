import type { CampaignState } from "./campaign.stateMachine";

export interface Campaign {
  id: string;
  snapshotId: string;
  startedBy: string;
  status: CampaignState;
  startedAt: string;
  finishedAt: string | null;
  contactsTotal: number;
  contactsQueued: number;
}

export interface CampaignJobSummary {
  queued: number;
  inProgress: number;
  completed: number;
  failed: number;
}

export interface CampaignWithJobs {
  campaign: Campaign;
  jobs: CampaignJobSummary;
}
