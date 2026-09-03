import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { auditService } from "../audit/audit.service.js";
import { evaluateConditions, type DetectionConditions } from "../detections/detection-engine.js";
import { normalizeEvent, type RawSecurityEventInput } from "./event-normalizer.js";
import { CorrelationService } from "../correlation/correlation.service.js";

const json = (value: unknown) => value as Prisma.InputJsonValue | undefined;

export class EventService {
  private readonly correlationService = new CorrelationService();
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
    const network = created.network && typeof created.network === "object" && !Array.isArray(created.network) ? created.network as Record<string, unknown> : {};
    const host = created.host && typeof created.host === "object" && !Array.isArray(created.host) ? created.host as Record<string, unknown> : {};
    const observables = [
      ...[network.sourceIp, network.destinationIp, network.ip].filter(Boolean).map((value) => ({ type: "ip", value: String(value) })),
      ...[host.domain, network.domain].filter(Boolean).map((value) => ({ type: "domain", value: String(value).toLowerCase() })),
    ];
    if (observables.length) {
      const indicators = await prisma.threatIndicator.findMany({ where: {
        tenantId,
        AND: [
          { OR: observables.map(({ type, value }) => ({ type, value })) },
          { OR: [{ validUntil: null }, { validUntil: { gt: new Date() } }] },
        ],
      } });
      for (const indicator of indicators) {
        const indicatorSeverity = { low: 25, medium: 50, high: 75, critical: 95 }[indicator.severity] ?? 50;
        const intelAlert = await prisma.securityAlert.create({ data: {
          tenantId, title: `Threat intelligence match: ${indicator.type}`,
          description: `${indicator.value} matched indicator from ${indicator.source}`,
          severity: indicator.severity, confidence: indicator.confidence,
          riskScore: Math.min(100, Math.round((indicator.confidence + indicatorSeverity) / 2)),
          source: "threat-intelligence", eventId: created.id, mitre: [],
          entities: json({ observable: { type: indicator.type, value: indicator.value }, indicatorId: indicator.id }),
          timeline: { create: { tenantId, type: "enrichment", title: `Matched ${indicator.source} indicator`, metadata: json({ indicatorId: indicator.id, eventId: created.id }) } },
        } });
        await this.correlationService.evaluateAlert(tenantId, intelAlert.id);
      }
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
      const match = await prisma.detectionMatch.create({
        data: {
          tenantId, eventId: created.id, ruleId: rule.id, severity: rule.severity,
          reason: json({ ruleVersion: rule.version, evaluated: result.evaluated })!,
        },
      });
      matches.push(match);
      const riskScore = { low: 25, medium: 50, high: 75, critical: 95 }[rule.severity] ?? 50;
      const alert = await prisma.securityAlert.create({ data: {
        tenantId, title: rule.name, description: rule.description, severity: rule.severity,
        confidence: 80, riskScore, source: created.source, ruleId: rule.id,
        eventId: created.id, matchId: match.id, mitre: rule.mitreTechniques,
        entities: json({ host: created.host, user: created.user, network: created.network }),
        timeline: { create: { tenantId, type: "detection", title: `Matched ${rule.name}`, metadata: json({ eventId: created.id, ruleId: rule.id }) } },
      } });
      await this.correlationService.evaluateAlert(tenantId, alert.id);
      for (const [entityType, entity] of Object.entries({ host: created.host, user: created.user, network: created.network })) {
        if (!entity || typeof entity !== "object" || Array.isArray(entity)) continue;
        const record = entity as Record<string, unknown>;
        const entityKey = String(record.id ?? record.name ?? record.ip ?? "");
        if (!entityKey) continue;
        await prisma.entityRisk.upsert({
          where: { tenantId_entityType_entityKey: { tenantId, entityType, entityKey } },
          create: { tenantId, entityType, entityKey, score: riskScore, reasons: json([{ ruleId: rule.id, eventId: created.id, score: riskScore }])! },
          update: { score: riskScore, reasons: json([{ ruleId: rule.id, eventId: created.id, score: riskScore }])! },
        });
      }
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
