import { Router } from "express";

export const campaignRouter = Router();

campaignRouter.get("/status", (_req, res) => {
  res.json({ module: "campaigns", status: "ready" });
});
