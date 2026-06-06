/**
 * Discord Webhook Adapter
 * Sends incident notifications to Discord channels
 */

import axios from "axios";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "discord-adapter" });

export interface DiscordWebhookPayload {
  webhookUrl: string;
  incidentId: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
}

export class DiscordAdapter {
  /**
   * Send incident notification to Discord
   */
  static async send(payload: DiscordWebhookPayload): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
  }> {
    try {
      const severityColor = this.getSeverityColor(payload.severity);

      const embed = {
        title: payload.title,
        description: payload.description,
        color: severityColor,
        fields: [
          {
            name: "Severity",
            value: payload.severity.toUpperCase(),
            inline: true,
          },
          {
            name: "Risk Score",
            value: `${payload.riskScore}/100`,
            inline: true,
          },
          {
            name: "Incident ID",
            value: payload.incidentId,
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      };

      const response = await axios.post(payload.webhookUrl, {
        embeds: [embed],
        username: "Hydra Security Alerts",
        avatar_url:
          "https://raw.githubusercontent.com/containerd/containerd/main/logo/png/containerd-horizontal-color.png",
      });

      logger.info(
        { incidentId: payload.incidentId, statusCode: response.status },
        "Discord notification sent"
      );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { incidentId: payload.incidentId, error: errorMessage },
        "Failed to send Discord notification"
      );

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private static getSeverityColor(severity: string): number {
    const colors: Record<string, number> = {
      critical: 0xff0000, // Red
      high: 0xff9900, // Orange
      medium: 0xffff00, // Yellow
      low: 0x00ff00, // Green
    };
    return colors[severity.toLowerCase()] || 0x808080; // Gray as default
  }
}
