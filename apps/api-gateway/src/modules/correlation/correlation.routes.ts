import type { FastifyInstance } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorization.middleware.js";
import { auditService } from "../audit/audit.service.js";

export async function correlationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);
  app.get("/", async (request) => ({ data: await prisma.correlationRule.findMany({ where: { tenantId: request.user!.tenantId }, include: { signals: { orderBy: { createdAt: "desc" }, take: 20 } } }) }));
  app.post("/", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["name", "description", "windowMinutes", "threshold", "groupBy", "outputSeverity"], properties: {
    name: { type: "string", minLength: 3, maxLength: 160 }, description: { type: "string", minLength: 3, maxLength: 2000 }, windowMinutes: { type: "integer", minimum: 1, maximum: 10080 }, threshold: { type: "integer", minimum: 2, maximum: 10000 }, groupBy: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_.]{0,127}$" }, severities: { type: "array", items: { type: "string", enum: ["low", "medium", "high", "critical"] } }, outputSeverity: { type: "string", enum: ["low", "medium", "high", "critical"] }, mitreTechniques: { type: "array", items: { type: "string", pattern: "^T[0-9]{4}(\\.[0-9]{3})?$" } }, status: { type: "string", enum: ["draft", "enabled", "disabled"] },
  } } }, handler: async (request, reply) => {
    const body = request.body as { name: string; description: string; windowMinutes: number; threshold: number; groupBy: string; severities?: string[]; outputSeverity: string; mitreTechniques?: string[]; status?: string };
    const rule = await prisma.correlationRule.create({ data: { tenantId: request.user!.tenantId, createdBy: request.user!.id, name: body.name, description: body.description, windowMinutes: body.windowMinutes, threshold: body.threshold, groupBy: body.groupBy, severities: body.severities ?? [], outputSeverity: body.outputSeverity, mitreTechniques: body.mitreTechniques ?? [], status: body.status ?? "draft" } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "correlation_rule.create", resourceType: "CorrelationRule", resourceId: rule.id });
    return reply.status(201).send({ data: rule });
  } });
  app.patch("/:id/status", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", required: ["status"], additionalProperties: false, properties: { status: { type: "string", enum: ["draft", "enabled", "disabled"] } } } }, handler: async (request) => {
    const { id } = request.params as { id: string }; const { status } = request.body as { status: string };
    const existing = await prisma.correlationRule.findFirst({ where: { id, tenantId: request.user!.tenantId } });
    if (!existing) throw new AppError(404, "CORRELATION_RULE_NOT_FOUND", "Correlation rule not found");
    return { data: await prisma.correlationRule.update({ where: { id }, data: { status } }) };
  } });
}
