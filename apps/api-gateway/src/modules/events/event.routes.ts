import type { FastifyInstance } from "fastify";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { AppError } from "../../errors/app-error.js";
import { EventService } from "./event.service.js";

const service = new EventService();
const entity = { type: "object", additionalProperties: true } as const;

export async function eventRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);
  app.post("/", {
    schema: { body: { type: "object", additionalProperties: false, required: ["source", "sourceType", "category", "action", "rawEvent"], properties: {
      timestamp: { type: "string", format: "date-time" }, source: { type: "string", minLength: 1, maxLength: 100 },
      sourceType: { type: "string", minLength: 1, maxLength: 100 }, category: { type: "string", minLength: 1, maxLength: 100 },
      action: { type: "string", minLength: 1, maxLength: 100 }, outcome: { type: "string", maxLength: 50 },
      severity: { type: "string", enum: ["informational", "low", "medium", "high", "critical"] },
      host: entity, user: entity, process: entity, network: entity, file: entity, cloud: entity,
      rawEvent: entity, metadata: entity,
    } } },
    handler: async (request, reply) => {
      try {
        const result = await service.ingest(request.user!.tenantId, request.user!.id, request.body as never);
        return reply.status(result.duplicate ? 200 : 201).send({ data: result });
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Invalid event")) throw new AppError(400, "INVALID_EVENT", error.message);
        throw error;
      }
    },
  });
  app.get("/", {
    schema: { querystring: { type: "object", properties: { limit: { type: "integer", minimum: 1, maximum: 200, default: 50 }, cursor: { type: "string" } } } },
    handler: async (request) => {
      const query = request.query as { limit?: number; cursor?: string };
      const rows = await service.list(request.user!.tenantId, query.limit ?? 50, query.cursor);
      const hasMore = rows.length > (query.limit ?? 50);
      const data = hasMore ? rows.slice(0, -1) : rows;
      return { data, pagination: { hasMore, nextCursor: hasMore ? data.at(-1)?.id : null } };
    },
  });
}
