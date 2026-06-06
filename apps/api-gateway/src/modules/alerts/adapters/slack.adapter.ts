/**
 * Slack Webhook Adapter
 * Sends incident notifications to Slack channels
 */

import axios from "axios";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "slack-adapter" });

export interface SlackWebhookPayload {
  webhookUrl: string;
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
}

export class SlackAdapter {
  /**
   * Send incident notification to Slack
   */
  static async send(payload: SlackWebhookPayload): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const color = this.getSeverityColor(payload.severity);

      const message = {
        text: `🚨 Security Incident: ${payload.title}`,
        attachments: [
          {
            color,
            title: payload.title,
            text: payload.description,
            fields: [
              {
                title: "Severity",
                value: payload.severity.toUpperCase(),
                short: true,
              },
              {
                title: "Risk Score",
                value: `${payload.riskScore}/100`,
                short: true,
              },
              {
                title: "Incident ID",
                value: payload.incidentId,
                short: false,
              },
            ],
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };

      const response = await axios.post(payload.webhookUrl, message);

      logger.info(
        { incidentId: payload.incidentId, statusCode: response.status },
        "Slack notification sent"
      );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { incidentId: payload.incidentId, error: errorMessage },
        "Failed to send Slack notification"
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private static getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      critical: "#ff0000",
      high: "#ff9900",
      medium: "#ffff00",
      low: "#00ff00",
    };
    return colors[severity.toLowerCase()] || "#808080";
  }
}
