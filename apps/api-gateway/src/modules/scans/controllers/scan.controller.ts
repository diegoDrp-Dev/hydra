import { addScanJob } from "../../../queues/scan.queue.js";
import { createChildLogger } from "../../../lib/logger.js";
import { ok, fail } from "../../../utils/httpResponse.js";

const logger = createChildLogger({ module: "scan-controller" });

export class ScanController {
  async create(request: any, reply: any) {
    try {
      const { url } = request.body;
      const userId = (request.user as any)?.id;

      const job = await addScanJob({
        url,
        userId,
      });

      logger.info({ jobId: job.id, url }, "Scan job created");

      return reply.send(ok(
        { jobId: job.id, target: url },
        "Scan added to queue"
      ));
    } catch (error) {
      logger.error({ error }, "Failed to create scan job");
      return reply.status(500).send(fail("Failed to queue scan", 500));
    }
  }
}