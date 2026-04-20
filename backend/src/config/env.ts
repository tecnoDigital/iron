import "dotenv/config";

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_SECRET: z.string().min(1),
  GOOGLE_TOKEN_ENCRYPTION_KEY: z.string().min(1),
  SQLITE_DB_PATH: z.string().optional(),
  SESSION_MAX_AGE_MINUTES: z.coerce.number().int().positive().default(120),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  ALLOWED_EMAIL_1: z.string().email(),
  ALLOWED_EMAIL_2: z.string().email(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().optional(),
  GOOGLE_SHEET_ID: z.string().optional(),
  GOOGLE_SHEET_RANGE: z.string().default("Sheet1!A:Z"),
  GOOGLE_SHEET_MOCK_ROWS: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
