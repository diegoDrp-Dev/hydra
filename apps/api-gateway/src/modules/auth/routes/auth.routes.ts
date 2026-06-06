import type { FastifyInstance } from "fastify";
import { AuthController } from "../controllers/auth.controller.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

const authController = new AuthController();

export async function authRoutes(app: FastifyInstance) {

  app.post("/register", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string" },
          password: { type: "string" }
        }
      }
    },
    handler: authController.register.bind(authController)
  });

  app.post("/login", {
    schema: {
      body: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string" },
          password: { type: "string" }
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
        user: (request as any).user,
      };
    },
  });

}