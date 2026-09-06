import { addScanJob } from "../../../queues/scan.queue.js";
import { createChildLogger } from "../../../lib/logger.js";
import { ok, fail } from "../../../utils/httpResponse.js";
import { assertAllowedScanTarget } from "../../../security/target-policy.js";
import { auditService } from "../../audit/audit.service.js";
import { AppError } from "../../../errors/app-error.js";

const logger = createChildLogger({ module: "scan-controller" });

export class ScanController {
  async create(request: any, reply: any) {
    try {
      const { url } = request.body;
      const userId = request.user.id;
      const target = await assertAllowedScanTarget(url);

      const job = await addScanJob({
        url: target.toString(),
        userId,
      });

      logger.info({ jobId: job.id, userId, targetHost: target.hostname }, "Scan job created");
      await auditService.record({
        actorId: userId,
        tenantId: request.user.tenantId,
        action: "scan.queue",
        resourceType: "ScanJob",
        resourceId: String(job.id),
        requestId: request.id,
        ipAddress: request.ip,
        metadata: { targetHost: target.hostname, protocol: target.protocol },
      });

      return reply.send(ok(
        { jobId: job.id, target: target.toString() },
        "Scan added to queue"
      ));
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error({ error }, "Failed to create scan job");
      return reply.status(500).send(fail("Failed to queue scan", 500));
    }
  }
}
