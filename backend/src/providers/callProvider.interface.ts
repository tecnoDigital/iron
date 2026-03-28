export interface CallProvider {
  createCall(payload: unknown): Promise<{ providerCallId: string }>;
}
