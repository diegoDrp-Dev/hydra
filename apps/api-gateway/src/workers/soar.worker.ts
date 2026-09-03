import "dotenv/config";
import { Worker } from "bullmq";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { redisConnection } from "../queues/redis.js";
import { workerConfig } from "../config/queue.config.js";
import { createChildLogger } from "../lib/logger.js";
import { env } from "../config/env.js";
import { validateSoarActions, type SoarAction } from "../modules/operations/soar-policy.js";

const logger = createChildLogger({ module: "soar-worker" });
const worker = new Worker("soar-executions", async (job) => {
  if (!env.soarExecutionEnabled) throw new Error("SOAR kill switch is disabled");
  const execution = await prisma.playbookExecution.findUnique({ where: { id: String(job.data.executionId) }, include: { playbook: true } });
  if (!execution || execution.status !== "approved") throw new Error("Execution is not approved");
  const actions: SoarAction[] = validateSoarActions(execution.playbook.actions);
  await prisma.playbookExecution.update({ where: { id: execution.id }, data: { status: "running" } });
  const results: unknown[] = [];
  try {
    for (const action of actions) {
      if (action.type === "create_case") {
        const record = await prisma.caseRecord.create({ data: { tenantId: execution.tenantId, title: action.title ?? execution.playbook.name, description: "Created by approved SOAR execution", ownerId: execution.requestedBy } });
        results.push({ type: action.type, resourceId: record.id });
      } else if (action.type === "add_case_note" && action.caseId && action.content) {
        const record = await prisma.caseRecord.findFirst({ where: { id: action.caseId, tenantId: execution.tenantId } });
        if (!record) throw new Error("Case target not found in tenant");
        const note = await prisma.timelineEntry.create({ data: { tenantId: execution.tenantId, caseId: record.id, type: "soar_note", title: "SOAR note", content: action.content, actorId: execution.approvedBy } });
        results.push({ type: action.type, resourceId: note.id });
      } else if (action.type === "set_alert_status" && action.alertId && action.status) {
        const result = await prisma.securityAlert.updateMany({ where: { id: action.alertId, tenantId: execution.tenantId }, data: { status: action.status } });
        if (result.count !== 1) throw new Error("Alert target not found in tenant");
        results.push({ type: action.type, resourceId: action.alertId });
      } else {
        throw new Error(`Unsupported or incomplete action: ${action.type}`);
      }
    }
    await prisma.playbookExecution.update({ where: { id: execution.id }, data: { status: "completed", result: results as Prisma.InputJsonValue } });
  } catch (error) {
    await prisma.playbookExecution.update({ where: { id: execution.id }, data: { status: "failed", result: { error: error instanceof Error ? error.message : "Unknown executor error" } } });
    throw error;
  }
}, { connection: redisConnection, concurrency: Math.min(workerConfig.concurrency, 3) });

worker.on("completed", (job) => logger.info({ jobId: job.id }, "SOAR execution completed"));
worker.on("failed", (job, error) => logger.error({ jobId: job?.id, error: error.message }, "SOAR execution failed"));
logger.info("SOAR worker started");
