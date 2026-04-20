import { Router } from "express";
import { ZodError } from "zod";

import { SheetSyncService } from "./sheetSync.service";
import { validateSyncInput } from "./sync.validator";

export const syncRouter = Router();
const sheetSyncService = new SheetSyncService();

syncRouter.get("/status", (_req, res) => {
  res.json({ module: "sync", status: "ready" });
});

syncRouter.post("/validate", async (req, res) => {
  try {
    const validatedInput = validateSyncInput(req.body);
    const result = await sheetSyncService.validateSheet(validatedInput);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "sync_validation_input_invalid", details: error.issues });
      return;
    }

    const message = error instanceof Error ? error.message : "sync_validation_failed";

    if (message === "google_sheet_not_configured") {
      res.status(503).json({ error: message });
      return;
    }

    if (message === "google_reauth_required") {
      res.status(401).json({ error: message });
      return;
    }

    if (message === "google_sheet_mock_rows_invalid") {
      res.status(400).json({ error: message });
      return;
    }

    res.status(500).json({ error: "sync_validation_failed" });
  }
});

syncRouter.post("/run", async (req, res) => {
  try {
    const validatedInput = validateSyncInput(req.body);
    const result = await sheetSyncService.runSyncAndBuildSnapshot(validatedInput);

    res.status(200).json({
      syncRun: result.syncRun,
      snapshot: {
        id: result.snapshot.id,
        version: result.snapshot.version,
        status: result.snapshot.status,
        createdAt: result.snapshot.createdAt,
        syncRunId: result.snapshot.syncRunId
      },
      summary: result.validation.summary
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "sync_validation_input_invalid", details: error.issues });
      return;
    }

    const message = error instanceof Error ? error.message : "sync_run_failed";

    if (message === "google_sheet_not_configured") {
      res.status(503).json({ error: message });
      return;
    }

    if (message === "google_reauth_required") {
      res.status(401).json({ error: message });
      return;
    }

    if (message === "google_sheet_mock_rows_invalid") {
      res.status(400).json({ error: message });
      return;
    }

    res.status(500).json({ error: "sync_run_failed" });
  }
});

syncRouter.get("/latest", (_req, res) => {
  const latestSyncRun = sheetSyncService.getLatestSyncRun();
  const latestSnapshot = sheetSyncService.getLatestSnapshot();

  res.status(200).json({
    latestSyncRun,
    latestSnapshot: latestSnapshot
      ? {
          id: latestSnapshot.id,
          syncRunId: latestSnapshot.syncRunId,
          version: latestSnapshot.version,
          createdAt: latestSnapshot.createdAt,
          status: latestSnapshot.status,
          summary: latestSnapshot.summary
        }
      : null
  });
});
