import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { errorBody } from "../../errors/app-error.js";
import { env, requireJwtSecret } from "../../config/env.js";

interface KorynJwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
  role?: "ANALYST" | "ADMIN";
  tenantId: string;
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send(errorBody("AUTH_TOKEN_MISSING", "Authentication token is required"));
    }

    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return reply.status(401).send(errorBody("AUTH_TOKEN_INVALID", "Authorization header must use Bearer scheme"));
    }

    const decoded = jwt.verify(
      token,
      requireJwtSecret(),
      { algorithms: ["HS256"], issuer: env.jwtIssuer, audience: env.jwtAudience },
    ) as KorynJwtPayload;

    if (!decoded.id || !decoded.email || !decoded.tenantId) throw new Error("Invalid token payload");
    request.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role ?? "ANALYST",
      tenantId: decoded.tenantId,
    };

    return;

  } catch {
    return reply.status(401).send(errorBody("AUTH_TOKEN_INVALID", "Authentication token is invalid or expired"));

  }
}
