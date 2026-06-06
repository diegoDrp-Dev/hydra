/**
 * Generic Webhook Adapter
 * Sends incident notifications to arbitrary webhook endpoints
 */

import axios from "axios";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "generic-adapter" });

export interface GenericWebhookPayload {
  webhookUrl: string;
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
}

export class GenericAdapter {
  /**
   * Send incident notification to generic webhook endpoint
   */
  static async send(payload: GenericWebhookPayload): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const body = {
        event: "security_incident",
        timestamp: new Date().toISOString(),
        incident: {
          id: payload.incidentId,
          title: payload.title,
          description: payload.description,
          severity: payload.severity,
          riskScore: payload.riskScore,
        },
      };

      const response = await axios.post(payload.webhookUrl, body, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Hydra-Security-Platform/1.0",
          "X-Hydra-Event": "incident-alert",
        },
        timeout: 10000,
      });

      logger.info(
        { incidentId: payload.incidentId, statusCode: response.status },
        "Generic webhook notification sent"
      );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { incidentId: payload.incidentId, error: errorMessage },
        "Failed to send generic webhook notification"
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
