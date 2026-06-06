/**
 * Risk Engine Types
 * Core domain models for risk assessment and scoring
 */

export type Severity = "low" | "medium" | "high" | "critical";

export interface RiskRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  weight: number; // 0-100
  evaluate: (context: RuleEvaluationContext) => boolean;
}

export interface RuleEvaluationContext {
  url: string;
  headers: Record<string, string | string[]>;
  statusCode: number;
  responseTime?: number;
  metadata?: Record<string, unknown>;
}

export interface RiskAssessmentResult {
  totalScore: number; // 0-100
  severity: Severity;
  risks: DetectedRisk[];
  ruleEvaluations: RuleEvaluation[];
}

export interface DetectedRisk {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  score: number; // 0-100
  description: string;
  remediation?: string;
}

export interface RuleEvaluation {
  ruleId: string;
  triggered: boolean;
  weight: number;
  score: number;
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  low: 25,
  medium: 50,
  high: 75,
  critical: 100,
};

export const calculateSeverity = (score: number): Severity => {
  if (score >= 80) return "critical";
  if (score >= 50) return "high";
  if (score >= 20) return "medium";
  return "low";
};

/**
 * Deduplication key generator for incidents
 * Creates a deterministic hash based on risk factors
 */
export const generateDeduplicationKey = (
  url: string,
  risks: DetectedRisk[]
): string => {
  const riskSignature = risks
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId))
    .map((r) => `${r.ruleId}:${r.severity}`)
    .join("|");

  const urlHash = new URL(url).hostname;
  return `${urlHash}:${riskSignature}`;
};
