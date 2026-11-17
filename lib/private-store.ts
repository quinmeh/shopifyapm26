import { redisClient } from "./redis";
const globalStore = globalThis as unknown as { privateValues?: Map<string, { value: unknown; expires: number }>; privateSets?: Map<string, Set<string>> };
const values = globalStore.privateValues ??= new Map();
const sets = globalStore.privateSets ??= new Map();
function redis() {
  const client = redisClient(); if (client) return client;
  if (process.env.NODE_ENV === "production") throw new Error("Persistent storage must be configured.");
  return null;
}
export async function read<T>(key: string): Promise<T | null> {
  const db = redis(); if (db) return db.get<T>(key);
  const entry = values.get(key);
  if (!entry || entry.expires <= Date.now()) { values.delete(key); return null; }
  return entry.value as T;
}
export async function put(key: string, value: unknown, ttl: number, onlyNew = false) {
  const db = redis();
  if (db) return (await db.set(key, value, onlyNew ? { ex: ttl, nx: true } : { ex: ttl })) === "OK";
  const existing = values.get(key);
  if (onlyNew && existing && existing.expires > Date.now()) return false;
  values.set(key, { value, expires: Date.now() + ttl * 1000 }); return true;
}
export async function take<T>(key: string): Promise<T | null> {
  const db = redis(); if (db) return db.getdel<T>(key);
  const entry = values.get(key); values.delete(key);
  return entry && entry.expires > Date.now() ? entry.value as T : null;
}
export async function addMember(key: string, member: string) {
  const db = redis(); if (db) { await db.sadd(key, member); await db.expire(key, 60 * 60 * 24 * 31); return; }
  if (!sets.has(key)) sets.set(key, new Set()); sets.get(key)!.add(member);
}
export async function members(key: string): Promise<string[]> {
  const db = redis(); return db ? db.smembers(key) : [...(sets.get(key) ?? [])];
}
export async function removeMember(key: string, member: string) {
  const db = redis(); if (db) { await db.srem(key, member); return; } sets.get(key)?.delete(member);
}
