/**
 * Default Risk Rules for Security Scanning
 * Extensible rule set for detecting security misconfigurations
 */

import type { RiskRule, RuleEvaluationContext } from "../types/index.js";

export const defaultRules: RiskRule[] = [
  {
    id: "http_only",
    name: "HTTP Only (No HTTPS)",
    description: "Target uses HTTP instead of HTTPS, exposing data to interception",
    severity: "critical",
    weight: 40,
    evaluate: (ctx: RuleEvaluationContext) => !ctx.url.startsWith("https://"),
  },
  {
    id: "missing_hsts",
    name: "Missing HSTS Header",
    description:
      "HTTP Strict-Transport-Security header not present, allowing downgrade attacks",
    severity: "high",
    weight: 20,
    evaluate: (ctx: RuleEvaluationContext) =>
      !ctx.headers["strict-transport-security"] &&
      ctx.url.startsWith("https://"),
  },
  {
    id: "missing_csp",
    name: "Missing Content-Security-Policy",
    description: "CSP header not configured, increasing XSS vulnerability risk",
    severity: "high",
    weight: 20,
    evaluate: (ctx: RuleEvaluationContext) =>
      !ctx.headers["content-security-policy"],
  },
  {
    id: "missing_x_content_type",
    name: "Missing X-Content-Type-Options",
    description: "X-Content-Type-Options not set, allowing MIME-sniffing attacks",
    severity: "medium",
    weight: 10,
    evaluate: (ctx: RuleEvaluationContext) =>
      !ctx.headers["x-content-type-options"],
  },
  {
    id: "missing_x_frame_options",
    name: "Missing X-Frame-Options",
    description: "X-Frame-Options header missing, allowing clickjacking attacks",
    severity: "medium",
    weight: 10,
    evaluate: (ctx: RuleEvaluationContext) =>
      !ctx.headers["x-frame-options"],
  },
  {
    id: "missing_x_xss_protection",
    name: "Missing X-XSS-Protection",
    description: "X-XSS-Protection header missing, reducing XSS defense",
    severity: "low",
    weight: 5,
    evaluate: (ctx: RuleEvaluationContext) =>
      !ctx.headers["x-xss-protection"],
  },
  {
    id: "5xx_response",
    name: "Server Error Response",
    description: "Server returned 5xx error, indicating potential service issues",
    severity: "high",
    weight: 15,
    evaluate: (ctx: RuleEvaluationContext) =>
      ctx.statusCode >= 500 && ctx.statusCode < 600,
  },
  {
    id: "slow_response",
    name: "Slow Response Time",
    description: "Response time exceeds 5 seconds, potential DoS or performance issue",
    severity: "medium",
    weight: 8,
    evaluate: (ctx: RuleEvaluationContext) =>
      (ctx.responseTime || 0) > 5000,
  },
];

/**
 * Rule registry for managing custom rules
 * Allows dynamic rule addition and removal at runtime
 */
export class RuleRegistry {
  private rules: Map<string, RiskRule> = new Map();

  constructor(defaultRules: RiskRule[] = []) {
    defaultRules.forEach((rule) => this.register(rule));
  }

  register(rule: RiskRule): void {
    this.rules.set(rule.id, rule);
  }

  unregister(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  get(ruleId: string): RiskRule | undefined {
    return this.rules.get(ruleId);
  }

  getAll(): RiskRule[] {
    return Array.from(this.rules.values());
  }

  has(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }

  size(): number {
    return this.rules.size;
  }
}
