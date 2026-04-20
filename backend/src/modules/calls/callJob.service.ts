import { CallJobsRepository } from "../../db/repositories/callJobs.repository";

export class CallJobService {
  private callJobsRepository = new CallJobsRepository();

  getNextQueued(campaignId: string) {
    return this.callJobsRepository.getNextQueued(campaignId);
  }

  lock(jobId: string, lockUntilIso: string): void {
    this.callJobsRepository.lockJob(jobId, lockUntilIso);
  }

  markInProgress(jobId: string): void {
    this.callJobsRepository.updateState(jobId, "IN_PROGRESS");
  }

  markFailed(jobId: string, errorMessage: string): void {
    this.callJobsRepository.updateState(jobId, "COMPLETED_FAILED", errorMessage);
  }
}
