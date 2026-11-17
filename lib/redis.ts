import { Redis } from "@upstash/redis";

// Upstash credentials. Vercel's marketplace integration injects KV_REST_API_*;
// a directly created Upstash database uses UPSTASH_REDIS_REST_*. Accept either.
export function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function redisClient(): Redis | null {
  const config = redisConfig();
  return config ? new Redis(config) : null;
}
