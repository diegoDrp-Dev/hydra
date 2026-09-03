export type Severity = "informational" | "low" | "medium" | "high" | "critical";
export type ApiRecord = Record<string, unknown> & { id: string };

export interface SecurityAlert extends ApiRecord {
  title: string; description: string; severity: Severity; confidence: number;
  riskScore: number; status: string; source: string; createdAt: string;
  mitre?: string[]; entities?: Record<string, unknown>;
}

export interface SocIncident extends ApiRecord {
  title: string; description: string; severity: Severity; priority: string;
  riskScore: number; status: string; createdAt: string; updatedAt: string;
  alerts?: SecurityAlert[];
}

export interface EntityRisk extends ApiRecord {
  entityType: string; entityKey: string; score: number; reasons: unknown[]; updatedAt: string;
}

export interface Scan extends ApiRecord {
  url: string; statusCode?: number; duration?: number; score?: number;
  severity?: string; issues?: string[]; createdAt: string;
}
