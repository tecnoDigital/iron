import { Router } from "express";

export const webhookRouter = Router();

webhookRouter.post("/retell", (_req, res) => {
  res.status(202).json({ accepted: true });
});
