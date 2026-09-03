import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { auditService } from "../audit/audit.service.js";

const alertStatuses = ["new", "triaged", "investigating", "contained", "resolved", "false_positive", "closed"];

export async function socRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/alerts", async (request) => ({ data: await prisma.securityAlert.findMany({
    where: { tenantId: request.user!.tenantId }, orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }], take: 200,
    include: { match: { include: { rule: true, event: true } }, timeline: true },
  }) }));

  app.patch("/alerts/:id/status", { schema: { body: { type: "object", required: ["status"], additionalProperties: false, properties: { status: { type: "string", enum: alertStatuses } } } }, handler: async (request) => {
    const { id } = request.params as { id: string }; const { status } = request.body as { status: string };
    const alert = await prisma.securityAlert.findFirst({ where: { id, tenantId: request.user!.tenantId } });
    if (!alert) throw new AppError(404, "ALERT_NOT_FOUND", "Security alert not found");
    const updated = await prisma.securityAlert.update({ where: { id }, data: { status, timeline: { create: { tenantId: request.user!.tenantId, type: "status", title: `Status changed to ${status}`, actorId: request.user!.id } } } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "alert.status.update", resourceType: "SecurityAlert", resourceId: id, metadata: { status } });
    return { data: updated };
  } });

  app.get("/entity-risks", async (request) => ({ data: await prisma.entityRisk.findMany({ where: { tenantId: request.user!.tenantId }, orderBy: { score: "desc" }, take: 200 }) }));

  app.get("/incidents", async (request) => ({ data: await prisma.socIncident.findMany({ where: { tenantId: request.user!.tenantId }, include: { alerts: true, signals: { include: { rule: true } } }, orderBy: [{ riskScore: "desc" }, { updatedAt: "desc" }], take: 200 }) }));
  app.patch("/incidents/:id/status", { schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: ["new", "triaged", "investigating", "contained", "resolved", "closed"] } } } }, handler: async (request) => {
    const { id } = request.params as { id: string }; const { status } = request.body as { status: string };
    const incident = await prisma.socIncident.findFirst({ where: { id, tenantId: request.user!.tenantId } });
    if (!incident) throw new AppError(404, "INCIDENT_NOT_FOUND", "SOC incident not found");
    const updated = await prisma.socIncident.update({ where: { id }, data: { status } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "soc_incident.status.update", resourceType: "SocIncident", resourceId: id, metadata: { status } });
    return { data: updated };
  } });

  app.get("/cases", async (request) => ({ data: await prisma.caseRecord.findMany({ where: { tenantId: request.user!.tenantId }, include: { alerts: true }, orderBy: { updatedAt: "desc" } }) }));
  app.post("/cases", { schema: { body: { type: "object", additionalProperties: false, required: ["title"], properties: { title: { type: "string", minLength: 3, maxLength: 200 }, description: { type: "string", maxLength: 4000 }, priority: { type: "string", enum: ["low", "medium", "high", "critical"] }, alertIds: { type: "array", maxItems: 100, items: { type: "string" } } } } }, handler: async (request, reply) => {
    const body = request.body as { title: string; description?: string; priority?: string; alertIds?: string[] };
    const validAlerts = body.alertIds?.length ? await prisma.securityAlert.findMany({ where: { tenantId: request.user!.tenantId, id: { in: body.alertIds } }, select: { id: true } }) : [];
    if (validAlerts.length !== (body.alertIds?.length ?? 0)) throw new AppError(403, "INVALID_CASE_ALERTS", "One or more alerts are outside the current tenant");
    const record = await prisma.caseRecord.create({ data: { tenantId: request.user!.tenantId, title: body.title, description: body.description, priority: body.priority ?? "medium", ownerId: request.user!.id, alerts: { connect: validAlerts }, timeline: { create: { tenantId: request.user!.tenantId, type: "case_created", title: "Case created", actorId: request.user!.id } } }, include: { alerts: true, timeline: true } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "case.create", resourceType: "CaseRecord", resourceId: record.id });
    return reply.status(201).send({ data: record });
  } });

  app.post("/cases/:id/notes", { schema: { body: { type: "object", additionalProperties: false, required: ["content"], properties: { content: { type: "string", minLength: 1, maxLength: 10000 } } } }, handler: async (request, reply) => {
    const { id } = request.params as { id: string }; const { content } = request.body as { content: string };
    const record = await prisma.caseRecord.findFirst({ where: { id, tenantId: request.user!.tenantId } });
    if (!record) throw new AppError(404, "CASE_NOT_FOUND", "Case not found");
    const note = await prisma.timelineEntry.create({ data: { tenantId: request.user!.tenantId, caseId: id, type: "note", title: "Analyst note", content, actorId: request.user!.id } });
    return reply.status(201).send({ data: note });
  } });
}
