import { buildId } from "../../utils/ids";

interface OAuthStateRecord {
  value: string;
  expiresAt: number;
}

const oauthStates = new Map<string, OAuthStateRecord>();
const ttlMs = 10 * 60 * 1000;

const now = (): number => Date.now();

const cleanupExpiredStates = (): void => {
  const currentTime = now();
  for (const [key, state] of oauthStates.entries()) {
    if (state.expiresAt <= currentTime) {
      oauthStates.delete(key);
    }
  }
};

export const createOAuthState = (): string => {
  cleanupExpiredStates();

  const state = buildId();
  oauthStates.set(state, {
    value: state,
    expiresAt: now() + ttlMs
  });

  return state;
};

export const consumeOAuthState = (state: string): boolean => {
  cleanupExpiredStates();

  const record = oauthStates.get(state);
  if (!record) {
    return false;
  }

  oauthStates.delete(state);
  return true;
};
