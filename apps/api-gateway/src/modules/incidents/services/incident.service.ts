/**
 * Incident Service
 * Business logic for incident management and deduplication
 */

import { createChildLogger } from "../../../lib/logger.js";
import { RiskService } from "../../risk-engine/services/risk.service.js";
import { RiskRepository } from "../../risk-engine/repositories/risk.repository.js";
import {
  type DetectedRisk,
  generateDeduplicationKey,
} from "../../risk-engine/types/index.js";
import {
  IncidentRepository,
  type CreateIncidentInput,
} from "../repositories/incident.repository.js";

const logger = createChildLogger({ module: "incident-service" });

export interface GenerateIncidentInput {
  url: string;
  scanId: string;
  userId: string;
  riskScore: number;
  severity: string;
  risks: DetectedRisk[];
}

export class IncidentService {
  private incidentRepository: IncidentRepository;
  private riskRepository: RiskRepository;

  constructor() {
    this.incidentRepository = new IncidentRepository();
    this.riskRepository = new RiskRepository();
  }

  /**
   * Generate incident from scan with automatic deduplication
   * Returns existing incident if duplicate found, creates new one otherwise
   */
  async generateFromScan(input: GenerateIncidentInput): Promise<any> {
    try {
      // Generate deduplication key
      const deduplicationKey = generateDeduplicationKey(input.url, input.risks);

      logger.info(
        { url: input.url, deduplicationKey },
        "Checking for duplicate incidents"
      );

      // Check for existing incident
      const existing =
        await this.incidentRepository.findByDeduplicationKey(deduplicationKey);

      if (existing) {
        logger.info(
          { existingId: existing.id, newScanId: input.scanId },
          "Duplicate incident found, linking scan"
        );

        // Could update the existing incident with new scan data
        return {
          incident: existing,
          isNewIncident: false,
          isDuplicate: true,
        };
      }

      // Create new incident
      const incidentTitle = this.generateTitle(input.severity, input.url);
      const incidentDescription = this.generateDescription(
        input.risks,
        input.url
      );

      const createInput: CreateIncidentInput = {
        title: incidentTitle,
        description: incidentDescription,
        severity: input.severity,
        riskScore: input.riskScore,
        deduplicationKey,
        scanId: input.scanId,
        userId: input.userId,
      };

      const newIncident =
        await this.incidentRepository.createIncident(createInput);

      logger.info(
        { incidentId: newIncident.id, url: input.url },
        "New incident created from scan"
      );

      return {
        incident: newIncident,
        isNewIncident: true,
        isDuplicate: false,
      };
    } catch (error) {
      logger.error({ error }, "Failed to generate incident from scan");
      throw error;
    }
  }

  /**
   * Update incident status
   */
  async updateStatus(
    incidentId: string,
    status: string
  ): Promise<any> {
    const validStatuses = ["open", "investigating", "resolved", "false_positive"];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }

    return this.incidentRepository.updateStatus(incidentId, status);
  }

  /**
   * Get incident details
   */
  async getIncident(incidentId: string): Promise<any> {
    return this.incidentRepository.getById(incidentId);
  }

  /**
   * Get user's incidents
   */
  async getUserIncidents(
    userId: string,
    filter?: { status?: string; severity?: string }
  ): Promise<any[]> {
    return this.incidentRepository.getByUserId(userId, filter);
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents(limit?: number): Promise<any[]> {
    return this.incidentRepository.getOpenIncidents(limit);
  }

  /**
   * Get incident statistics
   */
  async getStats(): Promise<any> {
    return this.incidentRepository.getStats();
  }

  /**
   * Generate human-readable title for incident
   */
  private generateTitle(severity: string, url: string): string {
    const hostname = new URL(url).hostname;
    const severityLabel = severity.toUpperCase();
    return `[${severityLabel}] Security Issues Detected on ${hostname}`;
  }

  /**
   * Generate human-readable description for incident
   */
  private generateDescription(risks: DetectedRisk[], url: string): string {
    const riskList = risks
      .map(
        (r) =>
          `• ${r.ruleName} (${r.severity}): ${r.description}`
      )
      .join("\n");

    return (
      `Security assessment identified the following issues on ${url}:\n\n` +
      riskList +
      `\n\nPlease review and take appropriate remediation actions.`
    );
  }
}
