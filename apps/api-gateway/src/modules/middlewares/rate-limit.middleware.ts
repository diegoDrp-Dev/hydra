import type { FastifyInstance } from "fastify";
import { redisConnection } from "../../queues/redis.js";
import { errorBody } from "../../errors/app-error.js";

const script = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

export async function registerRateLimit(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health" || request.url === "/ready") return;
    const isAuth = request.url.startsWith("/auth/");
    const isIngestion = request.url.startsWith("/events") || request.url.startsWith("/scan");
    const limit = isAuth ? 20 : isIngestion ? 300 : 600;
    const identity = request.user?.id ?? request.ip;
    const windowMs = 60_000;
    try {
      const result = await redisConnection.eval(script, 1, `hydra:ratelimit:${isAuth ? "auth" : "api"}:${identity}`, windowMs) as [number, number];
      const [count, ttl] = result.map(Number);
      reply.header("X-RateLimit-Limit", limit).header("X-RateLimit-Remaining", Math.max(0, limit - count)).header("X-RateLimit-Reset", Math.ceil((Date.now() + ttl) / 1000));
      if (count > limit) return reply.status(429).send(errorBody("RATE_LIMITED", "Too many requests"));
    } catch (error) {
      request.log.warn({ err: error }, "Rate limiter unavailable; request allowed to preserve SOC availability");
    }
  });
}
