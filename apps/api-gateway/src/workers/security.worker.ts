import "dotenv/config";
import { Worker } from "bullmq";
import axios from "axios";

import { redisConnection } from "../queues/redis.js";
import { prisma } from "../lib/prisma.js";
import { createChildLogger } from "../lib/logger.js";
import { workerConfig } from "../config/queue.config.js";
import { RiskService } from "../modules/risk-engine/services/risk.service.js";
import { RiskRepository } from "../modules/risk-engine/repositories/risk.repository.js";
import { IncidentService } from "../modules/incidents/services/incident.service.js";
import { WebhookService } from "../modules/alerts/services/webhook.service.js";

const logger = createChildLogger({ module: "security-worker" });

const riskService = new RiskService();
const riskRepository = new RiskRepository();
const incidentService = new IncidentService();
const webhookService = new WebhookService();

/**
 * Resolve URL corretamente para ambiente Docker
 */
function resolveUrl(url: string) {
  if (!url) throw new Error("URL is missing in job data");

  // 🔥 FIX PRINCIPAL: localhost dentro do Docker não funciona
  if (url.includes("localhost")) {
    return url.replace("localhost", "host.docker.internal");
  }

  return url;
}

const worker = new Worker(
  "security-scans",
  async (job) => {
    const { url, userId } = job.data;

    const targetUrl = resolveUrl(url);

    logger.info(
      {
        jobId: job.id,
        originalUrl: url,
        resolvedUrl: targetUrl,
      },
      "Processing security scan"
    );

    try {
      const start = Date.now();

      logger.info(
        { jobId: job.id, targetUrl },
        "DEBUG: Starting HTTP request"
      );

      // 🔥 HTTP REQUEST
      const response = await axios.get(targetUrl, {
        timeout: 10000,
        validateStatus: () => true,
      });

      const duration = Date.now() - start;

      logger.info(
        {
          jobId: job.id,
          status: response.status,
          duration,
        },
        "DEBUG: HTTP request completed"
      );

      // 🔥 RISK ENGINE
      const assessment = riskService.assessRisk({
        url: targetUrl,
        headers: response.headers as Record<string, string | string[]>,
        statusCode: response.status,
        responseTime: duration,
      });

      logger.info(
        {
          jobId: job.id,
          riskScore: assessment.totalScore,
          severity: assessment.severity,
          riskCount: assessment.risks.length,
        },
        "Risk assessment completed"
      );

      // 🔥 SAVE SCAN
      const scan = await prisma.scan.create({
        data: {
          url: targetUrl,
          statusCode: response.status,
          duration,
          score: assessment.totalScore,
          severity: assessment.severity,
          issues: assessment.risks.map((r) => r.ruleId),
          userId: userId || null,
          headers: {
            create: {
              xContentTypeOptions:
                (response.headers["x-content-type-options"] as string) || null,
              strictTransportSecurity:
                (response.headers["strict-transport-security"] as string) || null,
              contentSecurityPolicy:
                (response.headers["content-security-policy"] as string) || null,
            },
          },
        },
      });

      await riskRepository.createRisks(scan.id, assessment.risks);

      logger.info(
        {
          jobId: job.id,
          scanId: scan.id,
        },
        "Scan saved successfully"
      );

      // 🔥 INCIDENTS
      if (assessment.risks.length > 0 && userId) {
        const incidentResult = await incidentService.generateFromScan({
          url: targetUrl,
          scanId: scan.id,
          userId,
          riskScore: assessment.totalScore,
          severity: assessment.severity,
          risks: assessment.risks,
        });

        const incident = incidentResult.incident;

        logger.info(
          {
            incidentId: incident.id,
            isDuplicate: incidentResult.isDuplicate,
          },
          "Incident generated"
        );

        if (incidentResult.isNewIncident) {
          const { sent, failed } =
            await webhookService.notifySubscribers(incident);

          logger.info(
            { incidentId: incident.id, sent, failed },
            "Webhook notifications sent"
          );
        }
      }

      return {
        success: true,
        scanId: scan.id,
        riskScore: assessment.totalScore,
        severity: assessment.severity,
      };
    } catch (error) {
      const err = error as Error;

      // 💣 DEBUG MÁXIMO (AGORA NÃO SOME MAIS)
      logger.error(
        {
          jobId: job.id,
          message: err.message,
          stack: err.stack,
          url: targetUrl,
        },
        "SCAN FAILED (FULL DEBUG)"
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: workerConfig.concurrency,
    maxStalledCount: workerConfig.maxStalledCount,
    stalledInterval: workerConfig.stalledInterval,
    lockDuration: workerConfig.lockDuration,
  }
);

// 🔥 EVENTOS DO WORKER
worker.on("completed", (job) => {
  logger.info({ jobId: job?.id }, "Scan completed");
});

worker.on("failed", (job, err) => {
  logger.error(
    {
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    },
    "Scan failed"
  );
});

worker.on("error", (error) => {
  logger.error({ error }, "Worker fatal error");
});

logger.info(
  { concurrency: workerConfig.concurrency },
  "Security worker started"
);