import { createHash } from "node:crypto";

export interface RawSecurityEventInput {
  timestamp?: string;
  source: string;
  sourceType: string;
  category: string;
  action: string;
  outcome?: string;
  severity?: string;
  host?: Record<string, unknown>;
  user?: Record<string, unknown>;
  process?: Record<string, unknown>;
  network?: Record<string, unknown>;
  file?: Record<string, unknown>;
  cloud?: Record<string, unknown>;
  rawEvent: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const SEVERITIES = new Set(["informational", "low", "medium", "high", "critical"]);

function stableJson(value: unknown): string {
  if (value === undefined) return "null";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function normalizeEvent(input: RawSecurityEventInput) {
  const timestamp = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(timestamp.getTime())) throw new Error("Invalid event timestamp");
  const severity = input.severity?.toLowerCase() ?? "informational";
  if (!SEVERITIES.has(severity)) throw new Error("Invalid event severity");

  const normalized = {
    timestamp,
    source: input.source.trim().toLowerCase(),
    sourceType: input.sourceType.trim().toLowerCase(),
    category: input.category.trim().toLowerCase(),
    action: input.action.trim().toLowerCase(),
    outcome: input.outcome?.trim().toLowerCase(),
    severity,
    host: input.host,
    user: input.user,
    process: input.process,
    network: input.network,
    file: input.file,
    cloud: input.cloud,
    rawEvent: input.rawEvent,
    metadata: input.metadata,
  };
  const deduplicationKey = createHash("sha256").update(stableJson(normalized)).digest("hex");
  return { ...normalized, deduplicationKey };
}
