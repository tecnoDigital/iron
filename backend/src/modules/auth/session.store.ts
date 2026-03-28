import { env } from "../../config/env";
import { buildId } from "../../utils/ids";

export const SESSION_COOKIE_NAME = "ironpay.sid";

export interface SessionRecord {
  id: string;
  email: string;
  createdAt: number;
  lastSeenAt: number;
  expiresAt: number;
}

const sessions = new Map<string, SessionRecord>();

const maxAgeMs = env.SESSION_MAX_AGE_MINUTES * 60 * 1000;
const idleTimeoutMs = env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000;

const now = (): number => Date.now();

const isExpired = (session: SessionRecord): boolean => {
  const currentTime = now();
  const idleExpired = currentTime - session.lastSeenAt > idleTimeoutMs;
  const maxAgeExpired = currentTime > session.expiresAt;
  return idleExpired || maxAgeExpired;
};

export const createSession = (email: string): SessionRecord => {
  const currentTime = now();
  const session: SessionRecord = {
    id: buildId(),
    email,
    createdAt: currentTime,
    lastSeenAt: currentTime,
    expiresAt: currentTime + maxAgeMs
  };

  sessions.set(session.id, session);
  return session;
};

export const getSession = (sessionId: string): SessionRecord | null => {
  const session = sessions.get(sessionId);

  if (!session) {
    return null;
  }

  if (isExpired(session)) {
    sessions.delete(session.id);
    return null;
  }

  return session;
};

export const touchSession = (sessionId: string): SessionRecord | null => {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const updated: SessionRecord = {
    ...session,
    lastSeenAt: now()
  };

  sessions.set(sessionId, updated);
  return updated;
};

export const deleteSession = (sessionId: string): void => {
  sessions.delete(sessionId);
};

export const getSessionCookieMaxAgeMs = (): number => maxAgeMs;
