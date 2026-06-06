import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";
import { queueConfig } from "../config/queue.config.js";
import { createChildLogger } from "../lib/logger.js";

const logger = createChildLogger({ module: "scan-queue" });

export const scanQueue = new Queue("security-scans", {
  connection: redisConnection,
  defaultJobOptions: queueConfig.defaultJobOptions,
});

scanQueue.on("waiting", (job) => {
  logger.debug({ jobId: job.id }, "Job waiting");
});

export async function addScanJob(data: {
  url: string;
  userId?: string;
}) {
  try {
    const job = await scanQueue.add("security-scan", data, {
      jobId: `scan-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 11)}`,
    });

    logger.info(
      {
        jobId: job.id,
        url: data.url,
      },
      "Scan job added"
    );

    return job;
  } catch (error) {
    logger.error(
      {
        error,
      },
      "Failed to add scan job"
    );

    throw error;
  }
}