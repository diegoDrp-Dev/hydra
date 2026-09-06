import type { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {

  app.post("/register", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 12, maxLength: 128 }
        }
      }
    },
    handler: authController.register.bind(authController)
  });

  app.post("/login", {
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", maxLength: 254 },
          password: { type: "string", minLength: 1, maxLength: 128 }
        }
      }
    },
    handler: authController.login.bind(authController)
  });

  app.get("/me", {
    schema: {
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    preHandler: authMiddleware,
    handler: async (request) => {
      return {
        user: request.user,
      };
    },
  });

}
