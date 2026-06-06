import RedisModule from "ioredis";

const Redis = RedisModule as any;

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "redis",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
});