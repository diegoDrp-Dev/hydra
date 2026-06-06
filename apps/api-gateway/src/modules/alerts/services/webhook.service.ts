/**
 * Webhook Service
 * Coordinates webhook delivery and retry logic
 */

import { createChildLogger } from "../../../lib/logger.js";
import { prisma } from "../../../lib/prisma.js";
import { DiscordAdapter } from "../adapters/discord.adapter.js";
import { SlackAdapter } from "../adapters/slack.adapter.js";
import { GenericAdapter } from "../adapters/generic.adapter.js";

const logger = createChildLogger({ module: "webhook-service" });

export interface WebhookPayload {
  incidentId: string;
  webhookUrl: string;
  webhookType: string;
  title: string;
  description: string;
  severity: string;
  riskScore: number;
}

export class WebhookService {
  /**
   * Send webhook notification for incident
   */
  async sendNotification(payload: WebhookPayload): Promise<boolean> {
    try {
      let result;

      switch (payload.webhookType.toLowerCase()) {
        case "discord":
          result = await DiscordAdapter.send(payload);
          break;
        case "slack":
          result = await SlackAdapter.send(payload);
          break;
        case "generic":
        default:
          result = await GenericAdapter.send(payload);
          break;
      }

      if (result.success) {
        logger.info(
          { incidentId: payload.incidentId, type: payload.webhookType },
          "Webhook notification delivered"
        );

        // Record successful delivery
        await this.recordWebhookEvent(payload, result.statusCode || 200, null);
        return true;
      } else {
        logger.warn(
          { incidentId: payload.incidentId, error: result.error },
          "Webhook delivery failed"
        );

        // Record failed delivery
        await this.recordWebhookEvent(payload, 0, result.error ?? null);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { incidentId: payload.incidentId, error: errorMessage },
        "Webhook sending exception"
      );

      await this.recordWebhookEvent(payload, 0, errorMessage);
      return false;
    }
  }

  /**
   * Record webhook delivery event
   */
  private async recordWebhookEvent(
    payload: WebhookPayload,
    statusCode: number,
    error: string | null
  ): Promise<void> {
    try {
      await prisma.webhookEvent.create({
        data: {
          webhookUrl: payload.webhookUrl,
          incidentId: payload.incidentId,
          statusCode: statusCode || null,
          error: error || null,
        },
      });
    } catch (err) {
      logger.error({ error: err }, "Failed to record webhook event");
    }
  }

  /**
   * Subscribe user to webhook notifications
   */
  async subscribe(
    userId: string,
    webhookUrl: string,
    webhookType: string,
    severities: string[] = ["critical", "high"]
  ): Promise<any> {
    try {
      const subscription = await prisma.alertSubscription.upsert({
        where: {
          userId_webhookUrl: {
            userId,
            webhookUrl,
          },
        },
        create: {
          userId,
          webhookUrl,
          webhookType,
          severities,
        },
        update: {
          webhookType,
          severities,
          isActive: true,
        },
      });

      logger.info(
        { userId, webhookUrl, type: webhookType },
        "Webhook subscription created/updated"
      );

      return subscription;
    } catch (error) {
      logger.error({ error }, "Failed to create webhook subscription");
      throw error;
    }
  }

  /**
   * Unsubscribe from webhook notifications
   */
  async unsubscribe(userId: string, webhookUrl: string): Promise<boolean> {
    try {
      const result = await prisma.alertSubscription.update({
        where: {
          userId_webhookUrl: {
            userId,
            webhookUrl,
          },
        },
        data: {
          isActive: false,
        },
      });

      logger.info({ userId, webhookUrl }, "Webhook subscription disabled");
      return true;
    } catch (error) {
      logger.error({ error }, "Failed to unsubscribe from webhook");
      return false;
    }
  }

  /**
   * Get user's webhook subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<any[]> {
    try {
      const subscriptions = await prisma.alertSubscription.findMany({
        where: { userId, isActive: true },
      });

      return subscriptions;
    } catch (error) {
      logger.error({ error }, "Failed to fetch user subscriptions");
      throw error;
    }
  }

  /**
   * Notify subscribers about incident
   */
  async notifySubscribers(
    incident: any
  ): Promise<{ sent: number; failed: number }> {
    try {
      // Find all subscriptions for this severity level
      const subscriptions = await prisma.alertSubscription.findMany({
        where: {
          isActive: true,
          severities: {
            hasSome: [incident.severity],
          },
        },
      });

      let sent = 0;
      let failed = 0;

      for (const subscription of subscriptions) {
        const payload: WebhookPayload = {
          incidentId: incident.id,
          webhookUrl: subscription.webhookUrl,
          webhookType: subscription.webhookType,
          title: incident.title,
          description: incident.description,
          severity: incident.severity,
          riskScore: incident.riskScore,
        };

        const success = await this.sendNotification(payload);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      }

      logger.info(
        { incidentId: incident.id, sent, failed },
        "Incident notifications sent to subscribers"
      );

      return { sent, failed };
    } catch (error) {
      logger.error({ error }, "Failed to notify subscribers");
      return { sent: 0, failed: 0 };
    }
  }
}
