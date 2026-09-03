import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorization.middleware.js";
import { auditService } from "../audit/audit.service.js";
import { addSoarExecution } from "../../queues/soar.queue.js";
import { validateSoarActions } from "./soar-policy.js";
import { env } from "../../config/env.js";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function operationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/threat-intel", async (request) => ({ data: await prisma.threatIndicator.findMany({ where: { tenantId: request.user!.tenantId }, orderBy: { updatedAt: "desc" }, take: 500 }) }));
  app.post("/threat-intel", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["type", "value", "confidence", "severity", "source"], properties: {
    type: { type: "string", enum: ["ip", "domain", "url", "hash", "email", "cve"] }, value: { type: "string", minLength: 1, maxLength: 2048 }, confidence: { type: "integer", minimum: 0, maximum: 100 }, severity: { type: "string", enum: ["low", "medium", "high", "critical"] }, source: { type: "string", minLength: 1, maxLength: 200 }, validUntil: { type: "string", format: "date-time" }, metadata: { type: "object", additionalProperties: true },
  } } }, handler: async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const indicator = await prisma.threatIndicator.upsert({ where: { tenantId_type_value_source: { tenantId: request.user!.tenantId, type: String(body.type), value: String(body.value), source: String(body.source) } }, create: { tenantId: request.user!.tenantId, type: String(body.type), value: String(body.value), confidence: Number(body.confidence), severity: String(body.severity), source: String(body.source), validUntil: body.validUntil ? new Date(String(body.validUntil)) : undefined, metadata: body.metadata ? json(body.metadata) : undefined }, update: { confidence: Number(body.confidence), severity: String(body.severity), validUntil: body.validUntil ? new Date(String(body.validUntil)) : undefined, metadata: body.metadata ? json(body.metadata) : undefined } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "threat_indicator.upsert", resourceType: "ThreatIndicator", resourceId: indicator.id });
    return reply.status(201).send({ data: indicator });
  } });

  app.get("/playbooks", async (request) => ({ data: await prisma.playbook.findMany({ where: { tenantId: request.user!.tenantId }, include: { executions: { orderBy: { createdAt: "desc" }, take: 10 } }, orderBy: { updatedAt: "desc" } }) }));
  app.post("/playbooks", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["name", "actions"], properties: { name: { type: "string", minLength: 3, maxLength: 160 }, description: { type: "string", maxLength: 2000 }, actions: { type: "array", minItems: 1, maxItems: 50, items: { type: "object", required: ["type"], properties: { type: { type: "string", enum: ["create_case", "add_case_note", "set_alert_status"] }, title: { type: "string", maxLength: 200 }, content: { type: "string", maxLength: 10000 }, caseId: { type: "string" }, alertId: { type: "string" }, status: { type: "string", enum: ["triaged", "investigating", "contained", "resolved", "closed"] } } } } } } }, handler: async (request, reply) => {
    const body = request.body as { name: string; description?: string; actions: unknown[] };
    const actions = validateSoarActions(body.actions);
    const playbook = await prisma.playbook.create({ data: { tenantId: request.user!.tenantId, name: body.name, description: body.description, actions: json(actions), createdBy: request.user!.id } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "playbook.create", resourceType: "Playbook", resourceId: playbook.id });
    return reply.status(201).send({ data: playbook });
  } });

  app.patch("/playbooks/:id/status", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: ["draft", "enabled", "disabled", "deprecated"] } } } }, handler: async (request) => {
    const { id } = request.params as { id: string }; const { status } = request.body as { status: string };
    const existing = await prisma.playbook.findFirst({ where: { id, tenantId: request.user!.tenantId } });
    if (!existing) throw new AppError(404, "PLAYBOOK_NOT_FOUND", "Playbook not found");
    const playbook = await prisma.playbook.update({ where: { id }, data: { status } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "playbook.status.update", resourceType: "Playbook", resourceId: id, metadata: { status } });
    return { data: playbook };
  } });

  app.post("/playbooks/:id/executions", { schema: { headers: { type: "object", required: ["idempotency-key"], properties: { "idempotency-key": { type: "string", minLength: 8, maxLength: 200 } } }, body: { type: "object", additionalProperties: true } }, handler: async (request, reply) => {
    const { id } = request.params as { id: string }; const key = String(request.headers["idempotency-key"]);
    const playbook = await prisma.playbook.findFirst({ where: { id, tenantId: request.user!.tenantId, status: "enabled" } });
    if (!playbook) throw new AppError(404, "PLAYBOOK_NOT_AVAILABLE", "Enabled playbook not found");
    const execution = await prisma.playbookExecution.upsert({ where: { tenantId_idempotencyKey: { tenantId: request.user!.tenantId, idempotencyKey: key } }, create: { tenantId: request.user!.tenantId, playbookId: id, requestedBy: request.user!.id, idempotencyKey: key, input: json(request.body) }, update: {} });
    return reply.status(202).send({ data: execution });
  } });

  app.post("/executions/:id/approve", { preHandler: requireRole("ADMIN"), handler: async (request) => {
    if (!env.soarExecutionEnabled) throw new AppError(503, "SOAR_KILL_SWITCH", "SOAR execution is disabled by the platform kill switch");
    const { id } = request.params as { id: string };
    const execution = await prisma.playbookExecution.findFirst({ where: { id, tenantId: request.user!.tenantId, status: "pending_approval" } });
    if (!execution) throw new AppError(404, "EXECUTION_NOT_PENDING", "Pending execution not found");
    const approved = await prisma.playbookExecution.update({ where: { id }, data: { status: "approved", approvedBy: request.user!.id } });
    await addSoarExecution(approved.id);
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "playbook_execution.approve", resourceType: "PlaybookExecution", resourceId: id });
    return { data: approved, message: "Approved and queued for the isolated executor" };
  } });

  app.get("/feature-flags", async (request) => ({ data: await prisma.featureFlag.findMany({ where: { tenantId: request.user!.tenantId }, orderBy: { key: "asc" } }) }));
  app.put("/feature-flags/:key", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["enabled"], properties: { enabled: { type: "boolean" }, config: { type: "object", additionalProperties: true } } } }, handler: async (request) => {
    const { key } = request.params as { key: string }; const body = request.body as { enabled: boolean; config?: Record<string, unknown> };
    if (!/^[a-z][a-z0-9_.-]{2,99}$/.test(key)) throw new AppError(400, "INVALID_FLAG_KEY", "Invalid feature flag key");
    const flag = await prisma.featureFlag.upsert({ where: { tenantId_key: { tenantId: request.user!.tenantId, key } }, create: { tenantId: request.user!.tenantId, key, enabled: body.enabled, config: body.config ? json(body.config) : undefined, updatedBy: request.user!.id }, update: { enabled: body.enabled, config: body.config ? json(body.config) : undefined, updatedBy: request.user!.id } });
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "feature_flag.update", resourceType: "FeatureFlag", resourceId: flag.id, metadata: { key, enabled: body.enabled } });
    return { data: flag };
  } });

  app.get("/retention", async (request) => ({ data: await prisma.retentionPolicy.findMany({ where: { tenantId: request.user!.tenantId } }) }));
  app.put("/retention/:resource", { preHandler: requireRole("ADMIN"), schema: { body: { type: "object", additionalProperties: false, required: ["retentionDays", "enabled"], properties: { retentionDays: { type: "integer", minimum: 1, maximum: 3650 }, enabled: { type: "boolean" } } } }, handler: async (request) => {
    const { resource } = request.params as { resource: string }; const body = request.body as { retentionDays: number; enabled: boolean };
    if (!["events", "audit_logs", "webhook_events"].includes(resource)) throw new AppError(400, "INVALID_RETENTION_RESOURCE", "Unsupported retention resource");
    return { data: await prisma.retentionPolicy.upsert({ where: { tenantId_resource: { tenantId: request.user!.tenantId, resource } }, create: { tenantId: request.user!.tenantId, resource, retentionDays: body.retentionDays, enabled: body.enabled, updatedBy: request.user!.id }, update: { retentionDays: body.retentionDays, enabled: body.enabled, updatedBy: request.user!.id } }) };
  } });

  app.post("/retention/:resource/execute", { preHandler: requireRole("ADMIN"), schema: { headers: { type: "object", required: ["x-confirm-retention"], properties: { "x-confirm-retention": { type: "string", enum: ["true"] } } } }, handler: async (request) => {
    const { resource } = request.params as { resource: string };
    const policy = await prisma.retentionPolicy.findUnique({ where: { tenantId_resource: { tenantId: request.user!.tenantId, resource } } });
    if (!policy?.enabled) throw new AppError(409, "RETENTION_DISABLED", "Retention policy is not enabled");
    const before = new Date(Date.now() - policy.retentionDays * 86_400_000);
    let deleted = 0;
    if (resource === "events") deleted = (await prisma.securityEvent.deleteMany({ where: { tenantId: request.user!.tenantId, ingestionTimestamp: { lt: before }, matches: { none: { alert: { isNot: null } } } } })).count;
    else if (resource === "audit_logs") deleted = (await prisma.auditLog.deleteMany({ where: { tenantId: request.user!.tenantId, createdAt: { lt: before } } })).count;
    else throw new AppError(400, "RETENTION_MANUAL_ONLY", "This resource requires an external archival adapter");
    await auditService.record({ tenantId: request.user!.tenantId, actorId: request.user!.id, action: "retention.execute", resourceType: resource, metadata: { deleted, before: before.toISOString() } });
    return { data: { resource, deleted, before } };
  } });
}
