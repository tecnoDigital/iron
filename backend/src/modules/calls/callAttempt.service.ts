import { CallAttemptsRepository } from "../../db/repositories/callAttempts.repository";

export class CallAttemptService {
  private callAttemptsRepository = new CallAttemptsRepository();

  startDialing(callJobId: string, provider: string): { attemptId: string } {
    const created = this.callAttemptsRepository.createDialing(callJobId, provider);
    return { attemptId: created.id };
  }

  markInProgress(attemptId: string, providerCallId: string, rawResponse: unknown): void {
    this.callAttemptsRepository.markInProgress(attemptId, providerCallId, rawResponse);
  }

  markFailed(attemptId: string, errorMessage: string): void {
    this.callAttemptsRepository.markFailed(attemptId, errorMessage);
  }
}
