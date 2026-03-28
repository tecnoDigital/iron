import { Router } from "express";

import { GoogleAuthService } from "./googleAuth.service";

export const googleRouter = Router();
const googleAuthService = new GoogleAuthService();

googleRouter.get("/status", async (_req, res) => {
  const status = await googleAuthService.getConnectionStatus();

  if (status === "no_google_auth") {
    res.json({ module: "google", status: "reauth_required" });
    return;
  }

  res.json({ module: "google", status });
});
