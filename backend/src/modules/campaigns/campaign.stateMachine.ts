export type CampaignState =
  | "DRAFT"
  | "VALIDATED"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED";

const allowedTransitions: Record<CampaignState, CampaignState[]> = {
  DRAFT: ["VALIDATED", "FAILED"],
  VALIDATED: ["RUNNING", "FAILED"],
  RUNNING: ["PAUSED", "COMPLETED", "FAILED"],
  PAUSED: ["RUNNING", "FAILED"],
  COMPLETED: [],
  FAILED: []
};

export const canTransitionCampaignState = (from: CampaignState, to: CampaignState): boolean => {
  return allowedTransitions[from].includes(to);
};
