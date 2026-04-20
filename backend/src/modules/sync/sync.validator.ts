import { z } from "zod";

import type { SyncValidationInput } from "./sync.types";

const nonNegativeInt = z.number().int().nonnegative();

const SyncInputSchema = z
  .object({
    hasHeader: z.boolean().optional(),
    mapping: z
      .object({
        fullName: nonNegativeInt.optional(),
        phone: nonNegativeInt.optional(),
        amount: nonNegativeInt.optional()
      })
      .optional()
  })
  .optional();

const DEFAULT_MAPPING = {
  fullName: 0,
  phone: 1,
  amount: 2
} as const;

export const validateSyncInput = (payload: unknown): SyncValidationInput => {
  const parsed = SyncInputSchema.parse(payload);

  return {
    hasHeader: parsed?.hasHeader ?? true,
    mapping: {
      fullName: parsed?.mapping?.fullName ?? DEFAULT_MAPPING.fullName,
      phone: parsed?.mapping?.phone ?? DEFAULT_MAPPING.phone,
      amount: parsed?.mapping?.amount ?? DEFAULT_MAPPING.amount
    }
  };
};
