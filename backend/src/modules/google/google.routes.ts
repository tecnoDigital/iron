import { Router } from "express";

import { GoogleAuthService } from "./googleAuth.service";
import { mapGoogleConnectionToAuthState } from "./google.state";

export const googleRouter = Router();
const googleAuthService = new GoogleAuthService();

googleRouter.get("/status", async (_req, res) => {
  const status = await googleAuthService.getConnectionStatus();
  const state = mapGoogleConnectionToAuthState(status);

  res.json({ module: "google", status, state });
});
