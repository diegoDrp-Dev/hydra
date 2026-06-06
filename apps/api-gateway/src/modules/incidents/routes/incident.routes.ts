/**
 * Incident Routes
 * RESTful API endpoints for incident management
 */

import type { FastifyInstance } from "fastify";
import { IncidentController } from "../controllers/incident.controller.js";

const controller = new IncidentController();

export async function incidentRoutes(app: FastifyInstance) {
  /**
   * GET /incidents
   * Get all incidents for authenticated user
   */
  app.get("/", {
    schema: {
      description: "Get user incidents",
      tags: ["Incidents"],
      querystring: {
        type: "object",
        properties: {
          status: { type: "string" },
          severity: { type: "string" },
        },
      },
    },
    handler: controller.getUserIncidents.bind(controller),
  });

  /**
   * GET /incidents/:id
   * Get specific incident by ID
   */
  app.get("/:id", {
    schema: {
      description: "Get incident by ID",
      tags: ["Incidents"],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
        },
      },
    },
    handler: controller.getIncident.bind(controller),
  });

  /**
   * PATCH /incidents/:id/status
   * Update incident status
   */
  app.patch("/:id/status", {
    schema: {
      description: "Update incident status",
      tags: ["Incidents"],
      params: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string" },
        },
      },
      body: {
        type: "object",
        required: ["status"],
        properties: {
          status: {
            type: "string",
            enum: ["open", "investigating", "resolved", "false_positive"],
          },
        },
      },
    },
    handler: controller.updateIncidentStatus.bind(controller),
  });

  /**
   * GET /incidents/admin/open
   * Get all open incidents
   */
  app.get("/admin/open", {
    schema: {
      description: "Get open incidents",
      tags: ["Incidents"],
      querystring: {
        type: "object",
        properties: {
          limit: { type: "string" },
        },
      },
    },
    handler: controller.getOpenIncidents.bind(controller),
  });

  /**
   * GET /incidents/admin/stats
   * Get incident statistics
   */
  app.get("/admin/stats", {
    schema: {
      description: "Get incident statistics",
      tags: ["Incidents"],
    },
    handler: controller.getStats.bind(controller),
  });
}
