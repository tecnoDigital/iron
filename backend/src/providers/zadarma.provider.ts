import type { CallProvider } from "./callProvider.interface";

export class ZadarmaProvider implements CallProvider {
  async createCall(_payload: unknown): Promise<{ providerCallId: string }> {
    return { providerCallId: "zadarma_stub_id" };
  }
}
