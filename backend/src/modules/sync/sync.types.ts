export type SyncRunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface SyncColumnMapping {
  fullName: number;
  phone: number;
  amount: number;
}

export interface SyncValidationInput {
  hasHeader: boolean;
  mapping: SyncColumnMapping;
}

export interface SyncValidationIssue {
  rowNumber: number;
  reason: string;
}

export interface SyncValidationRow {
  rowNumber: number;
  fullName: string;
  phoneRaw: string;
  phoneE164: string | null;
  amountRaw: string;
  amountDecimal: string | null;
  isValid: boolean;
}

export interface SyncValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
}

export interface SyncValidationResult {
  summary: SyncValidationSummary;
  rows: SyncValidationRow[];
  issues: SyncValidationIssue[];
}
