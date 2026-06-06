import cors from "@fastify/cors";
import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";

import { authRoutes } from "./modules/auth/routes/auth.routes.js";
import { scanRoutes } from "./modules/scans/routes/scan.routes.js";

export const app = Fastify({
  logger: true,
});

app.register(cors, {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE"],
});

// ============================
// GLOBAL ERROR HANDLER
// ============================
app.setErrorHandler((error, request, reply) => {
  app.log.error({ error }, "Unhandled error");

  return reply.status(500).send({
    success: false,
    message: "Internal server error",
    data: []
  });
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