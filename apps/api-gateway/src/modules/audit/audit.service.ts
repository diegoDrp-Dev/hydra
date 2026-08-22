import { prisma } from "../../lib/prisma.js";
import { createChildLogger } from "../../lib/logger.js";
import type { Prisma } from "@prisma/client";

const logger = createChildLogger({ module: "audit-service" });

export interface AuditEvent {
  tenantId?: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  outcome?: "SUCCESS" | "FAILURE";
  requestId?: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  async record(event: AuditEvent): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actorId: event.actorId,
          tenantId: event.tenantId,
          action: event.action,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          outcome: event.outcome ?? "SUCCESS",
          requestId: event.requestId,
          ipAddress: event.ipAddress,
          metadata: event.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      logger.error({ error, action: event.action, resourceType: event.resourceType }, "Failed to persist audit event");
    }
  }
}

export const auditService = new AuditService();
