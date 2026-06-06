import { QueueOptions } from "bullmq";

/**
 * Queue configuration with production-ready settings
 * - Retry: 3 attempts with exponential backoff
 * - DLQ: Dead-letter queue for failed jobs
 * - Concurrency: Configurable per queue
 */
export const queueConfig = {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000, // Start at 2s: 2s → 4s → 8s
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: false, // Keep failed jobs for inspection
  },
} as QueueOptions;

export const workerConfig = {
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5"),
  maxStalledCount: 2,
  stalledInterval: 5000,
  lockDuration: 30000,
};

export const dlqConfig = {
  queueName: "security-scans-dlq",
  maxAge: 604800000, // 7 days in ms
};
