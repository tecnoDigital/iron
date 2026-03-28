import { Router } from "express";

export const syncRouter = Router();

syncRouter.get("/status", (_req, res) => {
  res.json({ module: "sync", status: "ready" });
});
