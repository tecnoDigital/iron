import { type Request, Router } from "express";

import { ALLOWED_EMAILS } from "../../config/allowedEmails";
import { env } from "../../config/env";
import { AuthService } from "./auth.service";
import { consumeOAuthState, createOAuthState } from "./oauthState.store";
import {
  createSession,
  deleteSession,
  getSession,
  getSessionCookieMaxAgeMs,
  SESSION_COOKIE_NAME,
  touchSession
} from "./session.store";
import { GoogleAuthService } from "../google/googleAuth.service";
import { mapGoogleConnectionToAuthState } from "../google/google.state";
import { AuditService } from "../audit/audit.service";
import { AUTH_AUDIT_ACTIONS } from "./auth.audit";

export const authRouter = Router();
const authService = new AuthService();
const googleAuthService = new GoogleAuthService();
const auditService = new AuditService();

const buildRequestMetadata = (req: Request): Record<string, unknown> => ({
  ip: req.ip,
  userAgent: req.get("user-agent") ?? "unknown"
});

const recordLoginRejected = (req: Request, reason: string, email?: string | null): void => {
  auditService.record({
    action: AUTH_AUDIT_ACTIONS.LOGIN_REJECTED,
    entityType: "auth",
    entityId: email ?? "anonymous",
    metadata: {
      reason,
      ...(email ? { email } : {}),
      ...buildRequestMetadata(req)
    }
  });
};

authRouter.get("/google/start", (_req, res) => {
  if (!googleAuthService.isConfigured()) {
    res.status(503).json({ error: "google_oauth_not_configured", state: "NO_GOOGLE_AUTH" });
    return;
  }

  const state = createOAuthState();
  const authUrl = googleAuthService.buildAuthUrl(state);
  res.redirect(authUrl);
});

authRouter.get("/google/callback", async (req, res) => {
  if (!googleAuthService.isConfigured()) {
    res.status(503).json({ error: "google_oauth_not_configured", state: "NO_GOOGLE_AUTH" });
    return;
  }

  const code = String(req.query.code ?? "").trim();
  const state = String(req.query.state ?? "").trim();

  if (!code) {
    recordLoginRejected(req, "missing_code");
    res.status(400).json({ error: "missing_code" });
    return;
  }

  if (!state || !consumeOAuthState(state)) {
    recordLoginRejected(req, "invalid_state");
    res.status(400).json({ error: "invalid_state" });
    return;
  }

  let email: string | null = null;
  let oauthTokens: Awaited<ReturnType<GoogleAuthService["exchangeCodeForLogin"]>>["tokens"] | null =
    null;
  try {
    const oauthResult = await googleAuthService.exchangeCodeForLogin(code);
    email = oauthResult.email;
    oauthTokens = oauthResult.tokens;
  } catch {
    recordLoginRejected(req, "oauth_exchange_failed");
    res.status(401).json({ error: "oauth_exchange_failed", state: "REAUTH_REQUIRED" });
    return;
  }

  if (!email) {
    recordLoginRejected(req, "invalid_google_profile");
    res.status(401).json({ error: "invalid_google_profile", state: "ACCESS_DENIED" });
    return;
  }

  if (!authService.isAllowedEmail(email, ALLOWED_EMAILS)) {
    recordLoginRejected(req, "email_not_allowlisted", email);
    res.status(403).json({ state: "ACCESS_DENIED" });
    return;
  }

  if (!oauthTokens) {
    recordLoginRejected(req, "oauth_tokens_missing", email);
    res.status(401).json({ error: "oauth_exchange_failed", state: "REAUTH_REQUIRED" });
    return;
  }

  googleAuthService.saveTokens(oauthTokens);

  const session = createSession(email);

  auditService.record({
    action: AUTH_AUDIT_ACTIONS.LOGIN_SUCCESS,
    entityType: "auth",
    entityId: session.id,
    metadata: {
      email: session.email,
      ...buildRequestMetadata(req)
    }
  });

  res.cookie(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    signed: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    maxAge: getSessionCookieMaxAgeMs()
  });

  res.status(200).json({ state: "SESSION_ACTIVE", email: session.email });
});

authRouter.post("/logout", (req, res) => {
  const sessionId = req.signedCookies?.[SESSION_COOKIE_NAME] as string | undefined;

  if (sessionId) {
    const session = getSession(sessionId);
    auditService.record({
      action: AUTH_AUDIT_ACTIONS.LOGOUT,
      entityType: "auth",
      entityId: sessionId,
      metadata: {
        ...(session ? { email: session.email } : {}),
        ...buildRequestMetadata(req)
      }
    });

    deleteSession(sessionId);
  }

  res.clearCookie(SESSION_COOKIE_NAME);
  res.status(200).json({ state: "NO_SESSION" });
});

authRouter.get("/status", async (req, res) => {
  const googleStatus = await googleAuthService.getConnectionStatus();

  const googleState = mapGoogleConnectionToAuthState(googleStatus);
  if (googleState !== "GOOGLE_CONNECTED") {
    res.status(200).json({ state: googleState });
    return;
  }

  const sessionId = req.signedCookies?.[SESSION_COOKIE_NAME] as string | undefined;

  if (!sessionId) {
    res.status(200).json({ state: "NO_SESSION" });
    return;
  }

  const currentSession = getSession(sessionId);

  if (!currentSession) {
    res.clearCookie(SESSION_COOKIE_NAME);
    res.status(200).json({ state: "NO_SESSION" });
    return;
  }

  const touchedSession = touchSession(currentSession.id);

  res.status(200).json({
    state: "SESSION_ACTIVE",
    email: touchedSession?.email ?? currentSession.email
  });
});
