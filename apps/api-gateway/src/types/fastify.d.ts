import "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      role: "ANALYST" | "ADMIN";
      tenantId: string;
    } | null;
  }
}
