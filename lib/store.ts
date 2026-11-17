// Gift storage: Upstash Redis when env vars are present (Vercel), otherwise an
// in-memory Map (local dev). The Map lives on globalThis so it survives HMR.
import { Redis } from "@upstash/redis";
import type { Gift } from "./types";

const KEY = (id: string) => `gift:${id}`;
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

type MemStore = Map<string, Gift>;
const g = globalThis as unknown as { __giftStore?: MemStore };

function redisOrNull(): Redis | null {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return Redis.fromEnv();
  }
  if (process.env.NODE_ENV === "production") throw new Error("Persistent gift storage must be configured.");
  return null;
}

export function storageMode(): "upstash" | "memory" {
  return process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? "upstash" : "memory";
}

function mem(): MemStore {
  if (!g.__giftStore) g.__giftStore = new Map();
  return g.__giftStore;
}

export async function getGift(id: string): Promise<Gift | null> {
  const redis = redisOrNull();
  if (redis) return (await redis.get<Gift>(KEY(id))) ?? null;
  return mem().get(id) ?? null;
}

export async function saveGift(gift: Gift): Promise<void> {
  const redis = redisOrNull();
  if (redis) {
    await redis.set(KEY(gift.id), gift, { ex: TTL_SECONDS });
    return;
  }
  mem().set(gift.id, gift);
}
