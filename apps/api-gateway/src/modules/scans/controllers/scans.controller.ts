import { prisma } from "../../../lib/prisma.js";
import { ok, fail } from "../../../utils/httpResponse.js";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "scans-controller" });

export class ScansController {

  async findAll(request: any, reply: any) {
    try {
      const scans = await prisma.scan.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });

      logger.info({ count: scans.length }, "Scans retrieved successfully");
      return reply.send(ok(scans, "Scans retrieved"));
    } catch (error) {
      logger.error({ error }, "Failed to retrieve scans");
      return reply.status(500).send(fail("Failed to retrieve scans", 500));
    }
  }

  async findOne(request: any, reply: any) {
    try {
      const { id } = request.params;

      const scan = await prisma.scan.findUnique({
        where: {
          id,
        },

        include: {
          headers: true,
        },
      });

      if (!scan) {
        logger.warn({ id }, "Scan not found");
        return reply.status(404).send(fail("Scan not found", 404));
      }

      logger.info({ id }, "Scan retrieved successfully");
      return reply.send(ok(scan, "Scan retrieved"));
    } catch (error) {
      logger.error({ error }, "Failed to retrieve scan");
      return reply.status(500).send(fail("Failed to retrieve scan", 500));
    }
  }
}