import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export async function checkRateLimit(key, limit, windowSeconds) {
  const count = Number(await redis.incr(key));
  if (count === 1) await redis.expire(key, windowSeconds);

  return Number.isFinite(count) && count <= limit;
}

export function getClientIp(request) {
  return (
    request.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    request.headers["x-real-ip"] ||
    "unknown"
  );
}
