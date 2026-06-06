/**
 * Risk Engine Tests
 * Unit tests for risk assessment and scoring
 */

import { RiskService } from "../src/modules/risk-engine/services/risk.service.js";
import { type RuleEvaluationContext } from "../src/modules/risk-engine/types/index.js";

describe("RiskService", () => {
  let riskService: RiskService;

  beforeEach(() => {
    riskService = new RiskService();
  });

  describe("assessRisk", () => {
    it("should detect HTTP-only sites as critical risk", () => {
      const context: RuleEvaluationContext = {
        url: "http://example.com",
        headers: {},
        statusCode: 200,
      };

      const result = riskService.assessRisk(context);

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.severity).toBe("critical");
      expect(result.risks.some((r) => r.ruleId === "http_only")).toBe(true);
    });

    it("should detect missing HSTS header", () => {
      const context: RuleEvaluationContext = {
        url: "https://example.com",
        headers: {},
        statusCode: 200,
      };

      const result = riskService.assessRisk(context);

      expect(result.risks.some((r) => r.ruleId === "missing_hsts")).toBe(true);
    });

    it("should detect missing CSP header", () => {
      const context: RuleEvaluationContext = {
        url: "https://example.com",
        headers: {},
        statusCode: 200,
      };

      const result = riskService.assessRisk(context);

      expect(result.risks.some((r) => r.ruleId === "missing_csp")).toBe(true);
    });

    it("should score zero for fully secure site", () => {
      const context: RuleEvaluationContext = {
        url: "https://example.com",
        headers: {
          "strict-transport-security": "max-age=31536000",
          "content-security-policy": "default-src 'self'",
          "x-content-type-options": "nosniff",
          "x-frame-options": "DENY",
        },
        statusCode: 200,
      };

      const result = riskService.assessRisk(context);

      expect(result.totalScore).toBe(0);
      expect(result.severity).toBe("low");
      expect(result.risks.length).toBe(0);
    });

    it("should detect 5xx errors as high risk", () => {
      const context: RuleEvaluationContext = {
        url: "https://example.com",
        headers: {
          "strict-transport-security": "max-age=31536000",
        },
        statusCode: 500,
      };

      const result = riskService.assessRisk(context);

      expect(result.risks.some((r) => r.ruleId === "5xx_response")).toBe(true);
    });

    it("should clamp score to 0-100 range", () => {
      const context: RuleEvaluationContext = {
        url: "http://example.com",
        headers: {},
        statusCode: 500,
        responseTime: 10000,
      };

      const result = riskService.assessRisk(context);

      expect(result.totalScore).toBeLessThanOrEqual(100);
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("rule management", () => {
    it("should register custom rules", () => {
      const customRule = {
        id: "test_rule",
        name: "Test Rule",
        description: "Test description",
        severity: "medium" as const,
        weight: 25,
        evaluate: () => true,
      };

      riskService.registerRule(customRule);

      expect(riskService.hasRule("test_rule")).toBe(true);
      expect(riskService.getRule("test_rule")).toEqual(customRule);
    });

    it("should unregister rules", () => {
      const customRule = {
        id: "test_rule",
        name: "Test Rule",
        description: "Test description",
        severity: "medium" as const,
        weight: 25,
        evaluate: () => true,
      };

      riskService.registerRule(customRule);
      expect(riskService.hasRule("test_rule")).toBe(true);

      riskService.unregisterRule("test_rule");
      expect(riskService.hasRule("test_rule")).toBe(false);
    });

    it("should list all rules", () => {
      const rules = riskService.getRules();

      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });
});
