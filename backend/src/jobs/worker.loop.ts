import { logger } from "../config/logger";
import { SequentialCallRunnerService } from "../modules/calls/sequentialCallRunner.service";

const WORKER_TICK_MS = 2_000;

export const runWorkerLoop = (): NodeJS.Timeout => {
  const runner = new SequentialCallRunnerService();

  const timer = setInterval(async () => {
    const result = await runner.runOnce();
    logger.debug({ result }, "Worker tick processed");
  }, WORKER_TICK_MS);

  return timer;
};
