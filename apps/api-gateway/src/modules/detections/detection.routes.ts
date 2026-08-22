import type { FastifyInstance } from "fastify";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/authorization.middleware.js";
import { auditService } from "../audit/audit.service.js";
import { AppError } from "../../errors/app-error.js";
import { evaluateConditions, type DetectionConditions } from "./detection-engine.js";

const conditionSchema = {
  type: "object", additionalProperties: false, required: ["field", "operator"],
  properties: {
    field: { type: "string", pattern: "^[a-zA-Z][a-zA-Z0-9_.]{0,127}$" },
    operator: { type: "string", enum: ["equals", "not_equals", "contains", "in", "gte", "lte", "exists"] },
    value: {},
  },
} as const;

export async function detectionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware);

  app.get("/", async (request) => ({
    data: await prisma.detectionRule.findMany({
      where: { tenantId: request.user!.tenantId }, orderBy: { updatedAt: "desc" },
    }),
  }));

  app.post("/", {
    preHandler: requireRole("ADMIN"),
    schema: { body: { type: "object", additionalProperties: false,
      required: ["name", "description", "severity", "conditions"], properties: {
        name: { type: "string", minLength: 3, maxLength: 160 }, description: { type: "string", minLength: 3, maxLength: 2000 },
        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
        status: { type: "string", enum: ["draft", "testing", "enabled", "disabled", "deprecated"] },
        conditions: { type: "object", additionalProperties: false, properties: {
          all: { type: "array", maxItems: 50, items: conditionSchema }, any: { type: "array", maxItems: 50, items: conditionSchema },
        } },
        dataSources: { type: "array", maxItems: 50, items: { type: "string", maxLength: 100 } },
        mitreTechniques: { type: "array", maxItems: 50, items: { type: "string", pattern: "^T[0-9]{4}(\\.[0-9]{3})?$" } },
        tags: { type: "array", maxItems: 50, items: { type: "string", maxLength: 50 } },
        falsePositiveNotes: { type: "string", maxLength: 4000 },
        references: { type: "array", maxItems: 25, items: { type: "string", maxLength: 2048 } },
      } },
    },
    handler: async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const conditions = body.conditions as { all?: unknown[]; any?: unknown[] };
      if ((conditions.all?.length ?? 0) + (conditions.any?.length ?? 0) === 0) {
        throw new AppError(400, "EMPTY_DETECTION", "At least one detection condition is required");
      }
      const rule = await prisma.detectionRule.create({ data: {
        tenantId: request.user!.tenantId, authorId: request.user!.id,
        name: String(body.name), description: String(body.description), severity: String(body.severity),
        status: String(body.status ?? "draft"), conditions: body.conditions as Prisma.InputJsonValue,
        dataSources: (body.dataSources as string[] | undefined) ?? [],
        mitreTechniques: (body.mitreTechniques as string[] | undefined) ?? [],
        tags: (body.tags as string[] | undefined) ?? [], falsePositiveNotes: body.falsePositiveNotes as string | undefined,
        references: (body.references as string[] | undefined) ?? [],
      } });
      await auditService.record({ actorId: request.user!.id, tenantId: request.user!.tenantId, action: "detection.create", resourceType: "DetectionRule", resourceId: rule.id });
      return reply.status(201).send({ data: rule });
    },
  });

  app.patch("/:id/status", {
    preHandler: requireRole("ADMIN"),
    schema: { params: { type: "object", required: ["id"], properties: { id: { type: "string" } } }, body: {
      type: "object", additionalProperties: false, required: ["status"], properties: {
        status: { type: "string", enum: ["draft", "testing", "enabled", "disabled", "deprecated"] },
      },
    } },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      const existing = await prisma.detectionRule.findFirst({ where: { id, tenantId: request.user!.tenantId } });
      if (!existing) throw new AppError(404, "DETECTION_NOT_FOUND", "Detection rule not found");
      const transitions: Record<string, string[]> = {
        draft: ["testing", "disabled"], testing: ["draft", "enabled", "disabled"],
        enabled: ["disabled", "deprecated"], disabled: ["testing", "enabled", "deprecated"], deprecated: [],
      };
      if (!transitions[existing.status]?.includes(status)) {
        throw new AppError(409, "INVALID_RULE_TRANSITION", `Detection cannot transition from ${existing.status} to ${status}`);
      }
      const rule = await prisma.detectionRule.update({ where: { id }, data: { status } });
      await auditService.record({ actorId: request.user!.id, tenantId: request.user!.tenantId, action: "detection.status.update", resourceType: "DetectionRule", resourceId: id, metadata: { status } });
      return { data: rule };
    },
  });

  app.post("/:id/test", {
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
      body: { type: "object", additionalProperties: false, required: ["events", "expectedMatches"], properties: {
        events: { type: "array", minItems: 1, maxItems: 1000, items: { type: "object", additionalProperties: true } },
        expectedMatches: { type: "integer", minimum: 0 },
      } },
    },
    handler: async (request) => {
      const { id } = request.params as { id: string };
      const body = request.body as { events: Record<string, unknown>[]; expectedMatches: number };
      const rule = await prisma.detectionRule.findFirst({ where: { id, tenantId: request.user!.tenantId } });
      if (!rule) throw new AppError(404, "DETECTION_NOT_FOUND", "Detection rule not found");
      const startedAt = performance.now();
      const matchedIndexes = body.events.flatMap((event, index) =>
        evaluateConditions(event, rule.conditions as unknown as DetectionConditions).matched ? [index] : [],
      );
      const actualMatches = matchedIndexes.length;
      const result = {
        ruleId: rule.id, ruleVersion: rule.version, expectedMatches: body.expectedMatches, actualMatches,
        falsePositives: Math.max(0, actualMatches - body.expectedMatches),
        falseNegatives: Math.max(0, body.expectedMatches - actualMatches), matchedIndexes,
        executionTimeMs: Number((performance.now() - startedAt).toFixed(3)),
        passed: actualMatches === body.expectedMatches,
      };
      await auditService.record({ actorId: request.user!.id, tenantId: request.user!.tenantId, action: "detection.test", resourceType: "DetectionRule", resourceId: id, metadata: result });
      return { data: result };
    },
  });
}
