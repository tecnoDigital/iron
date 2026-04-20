export interface CallJob {
  id: string;
  state: string;
}

export interface CallRunnerResult {
  processed: boolean;
  reason:
    | "no_campaign"
    | "campaign_not_running"
    | "no_queued_jobs"
    | "provider_dispatched"
    | "provider_failed";
  campaignId?: string;
  jobId?: string;
  attemptId?: string;
}
