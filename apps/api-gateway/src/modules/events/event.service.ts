import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { auditService } from "../audit/audit.service.js";
import { evaluateConditions, type DetectionConditions } from "../detections/detection-engine.js";
import { normalizeEvent, type RawSecurityEventInput } from "./event-normalizer.js";

const json = (value: unknown) => value as Prisma.InputJsonValue | undefined;

export class EventService {
  async ingest(tenantId: string, actorId: string, input: RawSecurityEventInput) {
    const event = normalizeEvent(input);
    const existing = await prisma.securityEvent.findUnique({
      where: { tenantId_deduplicationKey: { tenantId, deduplicationKey: event.deduplicationKey } },
      include: { matches: true },
    });
    if (existing) return { event: existing, duplicate: true, matches: existing.matches };

    let created;
    try {
      created = await prisma.securityEvent.create({
        data: {
          tenantId,
          ...event,
          host: json(event.host), user: json(event.user), process: json(event.process),
          network: json(event.network), file: json(event.file), cloud: json(event.cloud),
          rawEvent: json(event.rawEvent)!, metadata: json(event.metadata),
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const duplicate = await prisma.securityEvent.findUnique({
          where: { tenantId_deduplicationKey: { tenantId, deduplicationKey: event.deduplicationKey } },
          include: { matches: true },
        });
        if (duplicate) return { event: duplicate, duplicate: true, matches: duplicate.matches };
      }
      throw error;
    }
    const rules = await prisma.detectionRule.findMany({
      where: {
        tenantId,
        status: "enabled",
        OR: [{ dataSources: { isEmpty: true } }, { dataSources: { has: created.sourceType } }],
      },
    });
    const matches = [];
    for (const rule of rules) {
      const result = evaluateConditions(created, rule.conditions as unknown as DetectionConditions);
      if (!result.matched) continue;
      matches.push(await prisma.detectionMatch.create({
        data: {
          tenantId, eventId: created.id, ruleId: rule.id, severity: rule.severity,
          reason: json({ ruleVersion: rule.version, evaluated: result.evaluated })!,
        },
      }));
    }
    await auditService.record({
      actorId, tenantId, action: "event.ingest", resourceType: "SecurityEvent", resourceId: created.id,
      metadata: { tenantId, sourceType: created.sourceType, matchCount: matches.length },
    });
    return { event: created, duplicate: false, matches };
  }

  async list(tenantId: string, limit: number, cursor?: string) {
    return prisma.securityEvent.findMany({
      where: { tenantId }, take: limit + 1, orderBy: [{ timestamp: "desc" }, { id: "desc" }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { matches: { include: { rule: true } } },
    });
  }
}
