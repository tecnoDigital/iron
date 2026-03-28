import { randomUUID } from "node:crypto";

export const buildId = (): string => randomUUID();
