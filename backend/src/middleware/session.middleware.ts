import type { RequestHandler } from "express";

import { SESSION_COOKIE_NAME, touchSession } from "../modules/auth/session.store";

export const sessionMiddleware: RequestHandler = (req, res, next) => {
  const sessionId = req.signedCookies?.[SESSION_COOKIE_NAME] as string | undefined;

  if (!sessionId) {
    res.status(401).json({ error: "unauthorized", state: "NO_SESSION" });
    return;
  }

  const session = touchSession(sessionId);

  if (!session) {
    res.status(401).json({ error: "unauthorized", state: "NO_SESSION" });
    return;
  }

  next();
};
