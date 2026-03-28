import type { CallProvider } from "./callProvider.interface";

export class RetellProvider implements CallProvider {
  async createCall(_payload: unknown): Promise<{ providerCallId: string }> {
    return { providerCallId: "retell_stub_id" };
  }
}
