/**
 * WebSocket Manager
 * Handles real-time incident notifications via WebSocket
 */

import { FastifyInstance } from "fastify";
import { createChildLogger } from "../lib/logger.js";

const logger = createChildLogger({ module: "websocket" });

interface ConnectedClient {
  ws: any;
  userId: string;
  rooms: Set<string>;
}

export class WebSocketManager {
  private clients: Map<string, ConnectedClient> = new Map();
  private incidentRoom = "incidents";

  async register(app: FastifyInstance): Promise<void> {
    app.register(async (app) => {
      app.get("/ws", { websocket: true } as any, (socket: any, req: any) => {
        this.handleConnection(socket, req);
      });
    });

    logger.info("WebSocket manager registered");
  }

  private handleConnection(socket: any, req: any): void {
    const userId = req.user?.id || `anonymous-${Date.now()}`;
    const clientId = `${userId}-${Date.now()}`;

    const client: ConnectedClient = {
      ws: socket,
      userId,
      rooms: new Set([this.incidentRoom]),
    };

    this.clients.set(clientId, client);

    logger.info(
      {
        clientId,
        userId,
      },
      "WebSocket client connected"
    );

    socket.on("message", (data: Buffer) => {
      this.handleMessage(clientId, data.toString());
    });

    socket.on("close", () => {
      this.clients.delete(clientId);

      logger.info(
        {
          clientId,
        },
        "WebSocket client disconnected"
      );
    });

    socket.on("error", (error: Error) => {
      logger.error(
        {
          clientId,
          error,
        },
        "WebSocket error"
      );

      this.clients.delete(clientId);
    });

    socket.send(
      JSON.stringify({
        type: "connection",
        message: "Connected to Hydra Security Platform",
        clientId,
      })
    );
  }

  private handleMessage(clientId: string, message: string): void {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case "subscribe":
          this.handleSubscribe(clientId, data.room);
          break;

        case "unsubscribe":
          this.handleUnsubscribe(clientId, data.room);
          break;

        case "ping":
          this.handlePing(clientId);
          break;

        default:
          logger.warn(
            {
              clientId,
              type: data.type,
            },
            "Unknown message type"
          );
      }
    } catch (error) {
      logger.error(
        {
          clientId,
          error,
        },
        "Failed to parse WebSocket message"
      );
    }
  }

  private handleSubscribe(clientId: string, room: string): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    client.rooms.add(room);

    client.ws.send(
      JSON.stringify({
        type: "subscribed",
        room,
      })
    );
  }

  private handleUnsubscribe(clientId: string, room: string): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    client.rooms.delete(room);

    client.ws.send(
      JSON.stringify({
        type: "unsubscribed",
        room,
      })
    );
  }

  private handlePing(clientId: string): void {
    const client = this.clients.get(clientId);

    if (!client) return;

    client.ws.send(
      JSON.stringify({
        type: "pong",
      })
    );
  }

  broadcastIncident(incident: any): void {
    const message = JSON.stringify({
      type: "incident",
      data: {
        id: incident.id,
        title: incident.title,
        severity: incident.severity,
        riskScore: incident.riskScore,
        createdAt: incident.createdAt,
      },
    });

    let count = 0;

    for (const [clientId, client] of this.clients) {
      if (!client.rooms.has(this.incidentRoom)) continue;

      try {
        client.ws.send(message);
        count++;
      } catch (error) {
        logger.error(
          {
            clientId,
            error,
          },
          "Failed to send WebSocket message"
        );

        this.clients.delete(clientId);
      }
    }

    logger.debug(
      {
        incidentId: incident.id,
        recipients: count,
      },
      "Incident broadcast sent"
    );
  }

  sendToUser(userId: string, message: any): void {
    for (const [clientId, client] of this.clients) {
      if (client.userId !== userId) continue;

      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          {
            clientId,
            error,
          },
          "Failed to send message to user"
        );

        this.clients.delete(clientId);
      }
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();