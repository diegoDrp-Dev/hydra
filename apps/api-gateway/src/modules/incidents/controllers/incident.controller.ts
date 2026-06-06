/**
 * Incident Controller
 * HTTP request handlers for incident endpoints
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { createChildLogger } from "../../../lib/logger.js";
import { IncidentService } from "../services/incident.service.js";

const logger = createChildLogger({ module: "incident-controller" });

export class IncidentController {
  private incidentService: IncidentService;

  constructor() {
    this.incidentService = new IncidentService();
  }

  /**
   * Get all incidents for the authenticated user
   */
  async getUserIncidents(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { userId } = (request as any).user;
      const { status, severity } = request.query as any;

      const incidents = await this.incidentService.getUserIncidents(userId, {
        status,
        severity,
      });

      logger.info({ userId, count: incidents.length }, "User incidents fetched");
      return reply.send({
        success: true,
        data: incidents,
        count: incidents.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch user incidents");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch incidents",
      });
    }
  }

  /**
   * Get a specific incident by ID
   */
  async getIncident(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const incident = await this.incidentService.getIncident(id);

      if (!incident) {
        return reply.status(404).send({
          success: false,
          error: "Incident not found",
        });
      }

      logger.info({ incidentId: id }, "Incident fetched");
      return reply.send({
        success: true,
        data: incident,
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch incident");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch incident",
      });
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as any;
      const { status } = request.body as any;

      const updated = await this.incidentService.updateStatus(id, status);

      logger.info({ incidentId: id, newStatus: status }, "Incident updated");
      return reply.send({
        success: true,
        data: updated,
      });
    } catch (error) {
      logger.error({ error }, "Failed to update incident");
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return reply.status(400).send({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * Get open incidents (admin only)
   */
  async getOpenIncidents(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { limit } = request.query as any;
      const incidents = await this.incidentService.getOpenIncidents(
        limit ? parseInt(limit) : 10
      );

      logger.info({ count: incidents.length }, "Open incidents fetched");
      return reply.send({
        success: true,
        data: incidents,
        count: incidents.length,
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch open incidents");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch open incidents",
      });
    }
  }

  /**
   * Get incident statistics
   */
  async getStats(request: FastifyRequest, reply: FastifyReply) {
    try {
      const stats = await this.incidentService.getStats();

      logger.info({ stats }, "Incident statistics fetched");
      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error({ error }, "Failed to fetch incident statistics");
      return reply.status(500).send({
        success: false,
        error: "Failed to fetch statistics",
      });
    }
  }
}
