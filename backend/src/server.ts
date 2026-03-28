import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { GoogleAuthService } from "./modules/google/googleAuth.service";

const googleAuthService = new GoogleAuthService();

app.listen(env.PORT, async () => {
  const googleStatus = await googleAuthService.getConnectionStatus();
  logger.info({ googleStatus }, "Google auth startup validation");
  logger.info({ port: env.PORT }, "Backend running");
});
