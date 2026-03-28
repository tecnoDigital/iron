import { Router } from "express";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", (_req, res) => {
  res.json({ status: "ready" });
});
