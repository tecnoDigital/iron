export const buildAuditMetadata = (metadata: Record<string, unknown>): string => {
  return JSON.stringify(metadata);
};
