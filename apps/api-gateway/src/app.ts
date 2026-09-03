import cors from "@fastify/cors";
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";

import { authRoutes } from "./modules/auth/routes/auth.routes.js";
import { scanRoutes } from "./modules/scans/routes/scan.routes.js";
import { incidentRoutes } from "./modules/incidents/routes/incident.routes.js";
import { wsManager } from "./websocket/socket.js";
import { AppError, errorBody } from "./errors/app-error.js";
import { env } from "./config/env.js";
import { eventRoutes } from "./modules/events/event.routes.js";
import { detectionRoutes } from "./modules/detections/detection.routes.js";
import { socRoutes } from "./modules/soc/soc.routes.js";
import { operationsRoutes } from "./modules/operations/operations.routes.js";
import { prisma } from "./lib/prisma.js";
import { redisConnection } from "./queues/redis.js";
import { scanQueue } from "./queues/scan.queue.js";
import { authMiddleware } from "./modules/middlewares/auth.middleware.js";
import { requireRole } from "./modules/middlewares/authorization.middleware.js";
import { correlationRoutes } from "./modules/correlation/correlation.routes.js";
import { registerRateLimit } from "./modules/middlewares/rate-limit.middleware.js";

export const app = Fastify({
  logger: true,
});

app.decorateRequest("user", null);
void registerRateLimit(app);

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "no-referrer");
  reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return payload;
});

app.register(cors, {
  origin: env.corsOrigins,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});

app.register(websocket);

// ============================
// GLOBAL ERROR HANDLER
// ============================
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(errorBody(error.code, error.message, error.details));
  }
  const validation = typeof error === "object" && error !== null && "validation" in error
    ? (error as { validation?: unknown }).validation
    : undefined;
  if (validation) {
    return reply.status(400).send(errorBody("VALIDATION_ERROR", "Request validation failed", {
      validation,
    }));
  }

  request.log.error({ err: error }, "Unhandled error");
  return reply.status(500).send(errorBody("INTERNAL_ERROR", "Internal server error"));
});

app.get("/health", async () => ({ status: "ok" }));
app.get("/ready", async (_request, reply) => {
  try {
    await Promise.all([prisma.$queryRaw`SELECT 1`, redisConnection.ping()]);
    return { status: "ready", dependencies: { postgres: "up", redis: "up" } };
  } catch {
    return reply.status(503).send(errorBody("NOT_READY", "One or more dependencies are unavailable"));
  }
});

app.get("/metrics", { preHandler: [authMiddleware, requireRole("ADMIN")] }, async () => {
  const jobs = await scanQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed");
  return {
    process: { uptimeSeconds: Math.round(process.uptime()), memoryBytes: process.memoryUsage() },
    queue: jobs,
    websocketConnections: wsManager.getConnectedCount(),
    timestamp: new Date().toISOString(),
  };
});

// ============================
// SWAGGER CONFIG
// ============================
app.register(swagger, {
  swagger: {
    info: {
      title: "Hydra API",
      description: "Cyber Orchestrator System",
      version: "1.0.0",
    },

    schemes: ["http"],

    consumes: ["application/json"],
    produces: ["application/json"],

    securityDefinitions: {
      bearerAuth: {
        type: "apiKey",
        name: "Authorization",
        in: "header",
        description: "Coloque: Bearer <seu_token>",
      },
    },
  },
});

// ============================
// SWAGGER UI
// ============================
app.register(swaggerUI, {
  routePrefix: "/docs",

  uiConfig: {
    docExpansion: "list",
    persistAuthorization: true,
  },
});

// ============================
// AUTH ROUTES
// ============================
app.register(authRoutes, {
  prefix: "/auth",
});

// ============================
// SCAN ROUTES
// ============================
app.register(scanRoutes, {
  prefix: "/scan",
});

app.register(incidentRoutes, {
  prefix: "/incidents",
});

app.register(eventRoutes, { prefix: "/events" });
app.register(detectionRoutes, { prefix: "/detections" });
app.register(socRoutes, { prefix: "/soc" });
app.register(operationsRoutes, { prefix: "/operations" });
app.register(correlationRoutes, { prefix: "/correlations" });

void wsManager.register(app);
