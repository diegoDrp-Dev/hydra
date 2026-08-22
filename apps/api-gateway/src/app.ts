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

export const app = Fastify({
  logger: true,
});

app.decorateRequest("user", null);

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

void wsManager.register(app);
