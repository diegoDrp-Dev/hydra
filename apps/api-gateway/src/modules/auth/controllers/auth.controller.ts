import { AuthService } from "../services/auth.service.js";
import { createChildLogger } from "../../../lib/logger.js";

const logger = createChildLogger({ module: "auth-controller" });
const service = new AuthService();

export class AuthController {
  async register(request: any, reply: any) {
    try {
      const { email, password } = request.body;

      const result = await service.register(email, password);

      if ("error" in result) {
        logger.warn({ email }, "Registration failed");
        return reply.status(result.statusCode).send({
          success: false,
          message: result.error,
        });
      }

      logger.info({ email }, "User registered successfully");
      return reply.send({
        success: true,
        data: result.user,
      });
    } catch (error) {
      logger.error({ error }, "Registration failed");
      return reply.status(500).send({
        success: false,
        message: "Registration failed",
      });
    }
  }

  async login(request: any, reply: any) {
    try {
      const { email, password } = request.body;

      const result = await service.login(email, password);

      if ("error" in result) {
        logger.warn({ email }, "Login failed");
        return reply.status(result.statusCode).send({
          success: false,
          message: result.error,
        });
      }

      logger.info({ email }, "User logged in successfully");
      return reply.send({
        success: true,
        data: result.token,
      });
    } catch (error) {
      logger.error({ error }, "Login failed");
      return reply.status(500).send({
        success: false,
        message: "Login failed",
      });
    }
  }
}