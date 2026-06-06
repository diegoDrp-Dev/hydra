/**
 * Incident Repository
 * Data access layer for Incident entities
 * Handles incident persistence and retrieval
 */

import { prisma } from "../../../lib/prisma.js";
import type { Prisma } from "@prisma/client";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "incident-repository" });

/**
 * Tipo customizado para Incidente incluindo suas relações (Risks, Scan, Alerts)
 * Isso garante tipagem forte em todos os retornos do repositório.
 */
export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: { risks: true; scan: true; alerts: true };
}>;

export interface CreateIncidentInput {
  title: string;
  description: string;
  severity: string;
  riskScore: number;
  deduplicationKey: string;
  scanId?: string;
  userId: string;
  riskIds?: string[];
}

export class IncidentRepository {
  /**
   * Create a new incident
   */
  async createIncident(input: CreateIncidentInput): Promise<IncidentWithRelations> {
    try {
      const incident = await prisma.incident.create({
        data: {
          title: input.title,
          description: input.description,
          severity: input.severity,
          riskScore: input.riskScore,
          deduplicationKey: input.deduplicationKey,
          scanId: input.scanId,
          userId: input.userId,
          risks: input.riskIds
            ? {
              connect: input.riskIds.map((id) => ({ id })),
            }
            : undefined,
        },
        include: {
          risks: true,
          scan: true,
          alerts: true,
        },
      });

      logger.info(
        { incidentId: incident.id, deduplicationKey: input.deduplicationKey },
        "Incident created"
      );
      return incident;
    } catch (error) {
      logger.error({ error }, "Failed to create incident");
      throw error;
    }
  }

  /**
   * Find existing incident by deduplication key
   */
  async findByDeduplicationKey(deduplicationKey: string): Promise<IncidentWithRelations | null> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { deduplicationKey },
        include: { risks: true, scan: true, alerts: true },
      });

      return incident;
    } catch (error) {
      logger.error({ deduplicationKey, error }, "Failed to find incident");
      throw error;
    }
  }

  /**
   * Update incident status
   */
  async updateStatus(
    incidentId: string,
    status: string
  ): Promise<IncidentWithRelations> {
    try {
      const incident = await prisma.incident.update({
        where: { id: incidentId },
        data: { status, updatedAt: new Date() },
        include: { risks: true, scan: true, alerts: true },
      });

      logger.info({ incidentId, status }, "Incident status updated");
      return incident;
    } catch (error) {
      logger.error({ incidentId, error }, "Failed to update incident status");
      throw error;
    }
  }

  /**
   * Get incident by ID
   */
  async getById(incidentId: string): Promise<IncidentWithRelations | null> {
    try {
      const incident = await prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          risks: true,
          scan: true,
          alerts: true,
        },
      });

      return incident;
    } catch (error) {
      logger.error({ incidentId, error }, "Failed to fetch incident");
      throw error;
    }
  }

  /**
   * Get all incidents for a user
   */
  async getByUserId(
    userId: string,
    filter?: { status?: string; severity?: string }
  ): Promise<IncidentWithRelations[]> {
    try {
      const incidents = await prisma.incident.findMany({
        where: {
          userId,
          ...(filter?.status && { status: filter.status }),
          ...(filter?.severity && { severity: filter.severity }),
        },
        include: { risks: true, scan: true, alerts: true },
        orderBy: { createdAt: "desc" },
      });

      return incidents;
    } catch (error) {
      logger.error({ userId, error }, "Failed to fetch user incidents");
      throw error;
    }
  }

  /**
   * Get open incidents
   */
  async getOpenIncidents(limit: number = 10): Promise<IncidentWithRelations[]> {
    try {
      const incidents = await prisma.incident.findMany({
        where: { status: "open" },
        take: limit,
        orderBy: [{ riskScore: "desc" }, { createdAt: "desc" }],
        include: { risks: true, scan: true, alerts: true },
      });

      return incidents;
    } catch (error) {
      logger.error({ error }, "Failed to fetch open incidents");
      throw error;
    }
  }

  /**
   * Get incident statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    try {
      const incidents = await prisma.incident.findMany();

      const byStatus: Record<string, number> = {
        open: 0,
        investigating: 0,
        resolved: 0,
        false_positive: 0,
      };

      const bySeverity: Record<string, number> = {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      incidents.forEach((incident: any) => {
        byStatus[incident.status]++;
        bySeverity[incident.severity]++;
      });

      return {
        total: incidents.length,
        byStatus,
        bySeverity,
      };
    } catch (error) {
      logger.error({ error }, "Failed to get incident statistics");
      throw error;
    }
  }
}
