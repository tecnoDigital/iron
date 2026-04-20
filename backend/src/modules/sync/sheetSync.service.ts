import { GoogleSheetsService } from "../google/googleSheets.service";
import { SyncRepository, type SyncRunRecord } from "../../db/repositories/sync.repository";
import type { SnapshotRecord } from "../../db/repositories/snapshots.repository";
import { normalizePhone } from "../../utils/phone";
import { buildId } from "../../utils/ids";
import { SnapshotBuilderService } from "./snapshotBuilder.service";
import type {
  SyncValidationInput,
  SyncValidationIssue,
  SyncValidationResult,
  SyncValidationRow
} from "./sync.types";

const getCell = (row: string[], index: number): string => {
  return String(row[index] ?? "").trim();
};

const parseAmountDecimal = (rawAmount: string): string | null => {
  const cleaned = rawAmount.replace(/\s/g, "").replace(/,/g, "");
  if (!cleaned) {
    return null;
  }

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    return null;
  }

  const normalized = Number(cleaned);
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return normalized.toFixed(2);
};

export class SheetSyncService {
  private googleSheetsService = new GoogleSheetsService();
  private syncRepository = new SyncRepository();
  private snapshotBuilderService = new SnapshotBuilderService();

  async validateSheet(input: SyncValidationInput): Promise<SyncValidationResult> {
    const sheetRows = await this.googleSheetsService.readRows();
    const dataRows = input.hasHeader ? sheetRows.slice(1) : sheetRows;
    const offset = input.hasHeader ? 2 : 1;

    const rows: SyncValidationRow[] = [];
    const issues: SyncValidationIssue[] = [];
    const phoneOccurrences = new Map<string, number>();

    for (let index = 0; index < dataRows.length; index += 1) {
      const sourceRow = dataRows[index] ?? [];
      const rowNumber = index + offset;
      const fullName = getCell(sourceRow, input.mapping.fullName);
      const phoneRaw = getCell(sourceRow, input.mapping.phone);
      const amountRaw = getCell(sourceRow, input.mapping.amount);

      const phoneE164 = normalizePhone(phoneRaw);
      const amountDecimal = parseAmountDecimal(amountRaw);

      let isValid = true;

      if (!fullName) {
        isValid = false;
        issues.push({ rowNumber, reason: "full_name_required" });
      }

      if (!phoneE164) {
        isValid = false;
        issues.push({ rowNumber, reason: "phone_invalid" });
      }

      if (!amountDecimal) {
        isValid = false;
        issues.push({ rowNumber, reason: "amount_invalid" });
      }

      if (phoneE164) {
        phoneOccurrences.set(phoneE164, (phoneOccurrences.get(phoneE164) ?? 0) + 1);
      }

      rows.push({
        rowNumber,
        fullName,
        phoneRaw,
        phoneE164,
        amountRaw,
        amountDecimal,
        isValid
      });
    }

    let duplicateRows = 0;
    for (const row of rows) {
      if (row.phoneE164 && (phoneOccurrences.get(row.phoneE164) ?? 0) > 1) {
        duplicateRows += 1;
        row.isValid = false;
        issues.push({ rowNumber: row.rowNumber, reason: "phone_duplicate" });
      }
    }

    const validRows = rows.filter((row) => row.isValid).length;
    const invalidRows = rows.length - validRows;

    return {
      summary: {
        totalRows: rows.length,
        validRows,
        invalidRows,
        duplicateRows
      },
      rows,
      issues
    };
  }

  async runSyncAndBuildSnapshot(
    input: SyncValidationInput
  ): Promise<{ syncRun: SyncRunRecord; snapshot: SnapshotRecord; validation: SyncValidationResult }> {
    const syncRunId = buildId();
    const startedAt = new Date().toISOString();

    this.syncRepository.createRun(syncRunId, startedAt, input);

    try {
      const validation = await this.validateSheet(input);
      const finishedAt = new Date().toISOString();

      this.syncRepository.completeRun(syncRunId, finishedAt, validation.summary, validation.issues);
      const snapshot = this.snapshotBuilderService.createFromValidation(syncRunId, validation);
      const syncRun = this.syncRepository.getLatestRun();

      if (!syncRun) {
        throw new Error("sync_run_not_found_after_completion");
      }

      return { syncRun, snapshot, validation };
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const reason = error instanceof Error ? error.message : "sync_run_failed";
      this.syncRepository.failRun(syncRunId, finishedAt, reason);
      throw error;
    }
  }

  getLatestSyncRun(): SyncRunRecord | null {
    return this.syncRepository.getLatestRun();
  }

  getLatestSnapshot(): SnapshotRecord | null {
    return this.snapshotBuilderService.getLatestSnapshot();
  }
}
