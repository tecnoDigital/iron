import { Router } from "express";
import { z } from "zod";

import { CampaignService } from "./campaign.service";

export const campaignRouter = Router();
const campaignService = new CampaignService();

const createCampaignInputSchema = z
  .object({
    startedBy: z.string().min(1).max(120).optional()
  })
  .optional();

const campaignIdSchema = z.string().uuid();

campaignRouter.get("/status", (_req, res) => {
  res.json({ module: "campaigns", status: "ready" });
});

campaignRouter.post("/create", (req, res) => {
  try {
    const payload = createCampaignInputSchema.parse(req.body);
    const created = campaignService.createFromLatestSnapshot(payload?.startedBy);

    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "campaign_input_invalid", details: error.issues });
      return;
    }

    const message = error instanceof Error ? error.message : "campaign_create_failed";

    if (message === "snapshot_not_found") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "snapshot_not_eligible") {
      res.status(422).json({ error: message });
      return;
    }

    res.status(500).json({ error: "campaign_create_failed" });
  }
});

campaignRouter.get("/latest", (_req, res) => {
  const latest = campaignService.getLatest();
  if (!latest) {
    res.status(404).json({ error: "campaign_not_found" });
    return;
  }

  res.status(200).json(latest);
});

campaignRouter.get("/:campaignId", (req, res) => {
  try {
    const campaignId = campaignIdSchema.parse(req.params.campaignId);
    const campaign = campaignService.getById(campaignId);

    if (!campaign) {
      res.status(404).json({ error: "campaign_not_found" });
      return;
    }

    res.status(200).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "campaign_id_invalid", details: error.issues });
      return;
    }

    res.status(500).json({ error: "campaign_lookup_failed" });
  }
});

campaignRouter.post("/:campaignId/start", (req, res) => {
  try {
    const campaignId = campaignIdSchema.parse(req.params.campaignId);
    const updated = campaignService.transition(campaignId, "RUNNING");
    res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "campaign_transition_failed";

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "campaign_id_invalid", details: error.issues });
      return;
    }

    if (message === "campaign_not_found") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "campaign_transition_invalid") {
      res.status(409).json({ error: message });
      return;
    }

    res.status(500).json({ error: "campaign_transition_failed" });
  }
});

campaignRouter.post("/:campaignId/pause", (req, res) => {
  try {
    const campaignId = campaignIdSchema.parse(req.params.campaignId);
    const updated = campaignService.transition(campaignId, "PAUSED");
    res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "campaign_transition_failed";

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "campaign_id_invalid", details: error.issues });
      return;
    }

    if (message === "campaign_not_found") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "campaign_transition_invalid") {
      res.status(409).json({ error: message });
      return;
    }

    res.status(500).json({ error: "campaign_transition_failed" });
  }
});

campaignRouter.post("/:campaignId/resume", (req, res) => {
  try {
    const campaignId = campaignIdSchema.parse(req.params.campaignId);
    const updated = campaignService.transition(campaignId, "RUNNING");
    res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "campaign_transition_failed";

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "campaign_id_invalid", details: error.issues });
      return;
    }

    if (message === "campaign_not_found") {
      res.status(404).json({ error: message });
      return;
    }

    if (message === "campaign_transition_invalid") {
      res.status(409).json({ error: message });
      return;
    }

    res.status(500).json({ error: "campaign_transition_failed" });
  }
});
