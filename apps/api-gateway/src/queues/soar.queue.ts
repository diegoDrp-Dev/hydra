import { Queue } from "bullmq";
import { redisConnection } from "./redis.js";
import { queueConfig } from "../config/queue.config.js";

export const soarQueue = new Queue("soar-executions", { connection: redisConnection, defaultJobOptions: queueConfig.defaultJobOptions });

export async function addSoarExecution(executionId: string) {
  return soarQueue.add("execute-approved-playbook", { executionId }, { jobId: `soar-${executionId}` });
}
