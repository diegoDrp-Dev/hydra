import type { FastifyReply, FastifyRequest } from "fastify";
import { errorBody } from "../../errors/app-error.js";

export function requireRole(...roles: Array<"ANALYST" | "ADMIN">) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send(errorBody("AUTH_REQUIRED", "Authentication is required"));
    }
    if (!roles.includes(request.user.role)) {
      return reply.status(403).send(errorBody("FORBIDDEN", "The current role cannot perform this action"));
    }
  };
}
