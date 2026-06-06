/**
 * Risk Repository
 * Data access layer for Risk entities
 * Implements Repository pattern with Prisma
 */

import { prisma } from "../../../lib/prisma.js";
import { createChildLogger } from "../../../lib/logger.js";
import type { DetectedRisk } from "../types/index.js";

const logger = createChildLogger({ module: "risk-repository" });

export class RiskRepository {
  /**
   * Create multiple risks for a scan
   */
  async createRisks(
    scanId: string,
    risks: DetectedRisk[]
  ): Promise<Array<any>> {
    try {
      const created = await Promise.all(
        risks.map((risk) =>
          prisma.risk.create({
            data: {
              scanId,
              ruleId: risk.ruleId,
              severity: risk.severity,
              score: risk.score,
              description: risk.description,
              remediation: risk.remediation,
            },
          })
        )
      );

      logger.info(
        { scanId, riskCount: created.length },
        "Risks created for scan"
      );
      return created;
    } catch (error) {
      logger.error({ scanId, error }, "Failed to create risks");
      throw error;
    }
  }

  /**
   * Get risks for a specific scan
   */
  async getRisksByScan(scanId: string): Promise<any[]> {
    try {
      const risks = await prisma.risk.findMany({
        where: { scanId },
        orderBy: [{ severity: "desc" }, { score: "desc" }],
      });

      return risks;
    } catch (error) {
      logger.error({ scanId, error }, "Failed to fetch risks for scan");
      throw error;
    }
  }

  /**
   * Get critical risks
   */
  async getCriticalRisks(limit: number = 10): Promise<any[]> {
    try {
      const risks = await prisma.risk.findMany({
        where: { severity: "critical" },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { scan: true },
      });

      return risks;
    } catch (error) {
      logger.error({ error }, "Failed to fetch critical risks");
      throw error;
    }
  }

  /**
   * Get risks statistics
   */
  async getRiskStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
  }> {
    try {
      const risks = await prisma.risk.findMany();

      const bySeverity: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      risks.forEach((risk) => {
        bySeverity[risk.severity]++;
      });

      return {
        total: risks.length,
        bySeverity,
      };
    } catch (error) {
      logger.error({ error }, "Failed to get risk statistics");
      throw error;
    }
  }
}
