import { SnapshotsRepository, type SnapshotRecord } from "../../db/repositories/snapshots.repository";
import { buildId } from "../../utils/ids";
import type { SyncValidationResult } from "./sync.types";

export class SnapshotBuilderService {
  private snapshotsRepository = new SnapshotsRepository();

  createFromValidation(syncRunId: string, result: SyncValidationResult): SnapshotRecord {
    const latestSnapshot = this.snapshotsRepository.getLatestSnapshot();
    const version = (latestSnapshot?.version ?? 0) + 1;

    const snapshot: SnapshotRecord = {
      id: buildId(),
      syncRunId,
      version,
      createdAt: new Date().toISOString(),
      status: "READY",
      rows: result.rows,
      summary: result.summary
    };

    this.snapshotsRepository.save(snapshot);
    return snapshot;
  }

  getLatestSnapshot(): SnapshotRecord | null {
    return this.snapshotsRepository.getLatestSnapshot();
  }
}
