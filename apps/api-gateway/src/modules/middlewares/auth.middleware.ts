import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: "Token missing"
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    );

    (request as any).user = decoded;

    return;

  } catch (error) {

    console.log(error);

    return reply.status(401).send({
      error: "Invalid token"
    });

  }
}