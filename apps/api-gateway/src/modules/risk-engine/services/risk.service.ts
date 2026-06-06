/**
 * Risk Engine Service
 * Core business logic for risk assessment and scoring
 * Implements SOLID principles: SRP, OCP, DIP
 */

import { createChildLogger } from "../../../lib/logger.js";
import {
  type RiskRule,
  type RuleEvaluationContext,
  type RiskAssessmentResult,
  type DetectedRisk,
  type RuleEvaluation,
  calculateSeverity,
} from "../types/index.js";
import { RuleRegistry, defaultRules } from "../rules/default.rules.js";

const logger = createChildLogger({ module: "risk-engine" });

export class RiskService {
  private ruleRegistry: RuleRegistry;

  constructor(customRules: RiskRule[] = []) {
    this.ruleRegistry = new RuleRegistry(defaultRules);

    // Register custom rules
    customRules.forEach((rule) => this.ruleRegistry.register(rule));

    logger.info(
      { ruleCount: this.ruleRegistry.size() },
      "Risk engine initialized"
    );
  }

  /**
   * Assess risk for a given context
   * Returns comprehensive risk analysis with scoring
   */
  assessRisk(context: RuleEvaluationContext): RiskAssessmentResult {
    const rules = this.ruleRegistry.getAll();
    const ruleEvaluations: RuleEvaluation[] = [];
    const detectedRisks: DetectedRisk[] = [];

    let totalWeightedScore = 0;
    let totalWeight = 0;

    // Evaluate each rule
    for (const rule of rules) {
      const triggered = rule.evaluate(context);
      const ruleEvaluation: RuleEvaluation = {
        ruleId: rule.id,
        triggered,
        weight: rule.weight,
        score: triggered ? rule.weight : 0,
      };

      ruleEvaluations.push(ruleEvaluation);
      totalWeight += rule.weight;

      if (triggered) {
        detectedRisks.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          score: rule.weight,
          description: rule.description,
        });

        totalWeightedScore += rule.weight;
      }
    }

    // Normalize score to 0-100 range
    const normalizedScore = totalWeight > 0
      ? Math.round((totalWeightedScore / totalWeight) * 100)
      : 0;

    const clamped = Math.min(100, Math.max(0, normalizedScore));
    const severity = calculateSeverity(clamped);

    const result: RiskAssessmentResult = {
      totalScore: clamped,
      severity,
      risks: detectedRisks,
      ruleEvaluations,
    };

    logger.debug(
      {
        url: context.url,
        score: clamped,
        severity,
        riskCount: detectedRisks.length,
      },
      "Risk assessment completed"
    );

    return result;
  }

  /**
   * Register a new custom rule dynamically
   */
  registerRule(rule: RiskRule): void {
    this.ruleRegistry.register(rule);
    logger.info({ ruleId: rule.id, name: rule.name }, "Rule registered");
  }

  /**
   * Unregister an existing rule
   */
  unregisterRule(ruleId: string): boolean {
    const removed = this.ruleRegistry.unregister(ruleId);
    if (removed) {
      logger.info({ ruleId }, "Rule unregistered");
    }
    return removed;
  }

  /**
   * Get all active rules
   */
  getRules(): RiskRule[] {
    return this.ruleRegistry.getAll();
  }

  /**
   * Get a specific rule by ID
   */
  getRule(ruleId: string): RiskRule | undefined {
    return this.ruleRegistry.get(ruleId);
  }

  /**
   * Check if a rule exists
   */
  hasRule(ruleId: string): boolean {
    return this.ruleRegistry.has(ruleId);
  }
}
