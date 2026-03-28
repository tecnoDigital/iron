import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware";
import { requestLoggerMiddleware } from "./middleware/requestLogger.middleware";
import { authRouter } from "./modules/auth/auth.routes";
import { campaignRouter } from "./modules/campaigns/campaign.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { googleRouter } from "./modules/google/google.routes";
import { syncRouter } from "./modules/sync/sync.routes";
import { webhookRouter } from "./modules/webhooks/webhook.routes";

export const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(requestLoggerMiddleware);
app.use(rateLimitMiddleware);
app.use(express.json());
app.use(cookieParser(env.SESSION_SECRET));

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/google", googleRouter);
app.use("/sync", syncRouter);
app.use("/campaigns", campaignRouter);
app.use("/dashboard", dashboardRouter);
app.use("/webhooks", webhookRouter);

app.use(errorMiddleware);
