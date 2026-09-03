import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";

function readPath(input: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
    return (value as Record<string, unknown>)[key];
  }, input);
}
const severityScore: Record<string, number> = { low: 25, medium: 50, high: 75, critical: 95 };

export class CorrelationService {
  async evaluateAlert(tenantId: string, alertId: string) {
    const alert = await prisma.securityAlert.findFirst({ where: { id: alertId, tenantId } });
    if (!alert) return [];
    const rules = await prisma.correlationRule.findMany({ where: { tenantId, status: "enabled" } });
    const outputs = [];
    for (const rule of rules) {
      const entity = readPath(alert, rule.groupBy);
      if (typeof entity !== "string" && typeof entity !== "number") continue;
      const entityKey = String(entity);
      const since = new Date(Date.now() - rule.windowMinutes * 60_000);
      const candidates = await prisma.securityAlert.findMany({
        where: { tenantId, createdAt: { gte: since }, ...(rule.severities.length ? { severity: { in: rule.severities } } : {}) },
        orderBy: { createdAt: "asc" },
      });
      const correlated = candidates.filter((candidate) => String(readPath(candidate, rule.groupBy) ?? "") === entityKey);
      if (correlated.length < rule.threshold) continue;
      const bucket = Math.floor(Date.now() / (rule.windowMinutes * 60_000));
      const deduplicationKey = createHash("sha256").update(`${rule.id}:${entityKey}:${bucket}`).digest("hex");
      const score = Math.min(100, Math.max(severityScore[rule.outputSeverity] ?? 50, correlated.length * 10));
      const incident = await prisma.socIncident.upsert({
        where: { tenantId_deduplicationKey: { tenantId, deduplicationKey } },
        create: { tenantId, title: rule.name, description: `${correlated.length} alerts correlated by ${rule.groupBy}=${entityKey}`, severity: rule.outputSeverity, priority: rule.outputSeverity, riskScore: score, deduplicationKey },
        update: { riskScore: score, updatedAt: new Date() },
      });
      await prisma.securityAlert.updateMany({ where: { tenantId, id: { in: correlated.map(({ id }) => id) } }, data: { incidentId: incident.id } });
      const signal = await prisma.correlationSignal.create({ data: { tenantId, ruleId: rule.id, entityKey, alertIds: correlated.map(({ id }) => id), score, incidentId: incident.id } });
      outputs.push({ signal, incident });
    }
    return outputs;
  }
}
