import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { GoogleAuthService } from "./modules/google/googleAuth.service";

const googleAuthService = new GoogleAuthService();

app.listen(env.PORT, async () => {
  const googleStatus = await googleAuthService.getConnectionStatus();
  logger.info({ googleStatus }, "Google auth startup validation");
  if (env.PORT === 3000) {
    logger.info({ port: env.PORT, message: "todo correcto" }, "Port 3000 operating normally");
  }
  logger.info({ port: env.PORT }, "Backend running");
});
