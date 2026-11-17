import assert from "node:assert/strict";
import { test } from "node:test";
import { GET as health } from "../app/api/health/route";
import { getGift } from "../lib/store";

test("production without persistent storage is unhealthy and cannot silently use memory", async () => {
  const env = process.env as Record<string, string | undefined>;
  const keys = ["NODE_ENV", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const saved = Object.fromEntries(keys.map(key => [key, env[key]]));
  try {
    env.NODE_ENV = "production";
    delete env.UPSTASH_REDIS_REST_URL; delete env.UPSTASH_REDIS_REST_TOKEN;
    const response = await health();
    assert.equal(response.status, 503);
    assert.equal((await response.json()).ok, false);
    await assert.rejects(getGift("test"), /Persistent gift storage/);
    env.NODE_ENV = "development";
    assert.equal((await health()).status, 200);
    assert.equal(await getGift("nonexistent-deployment-test"), null);
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete env[key]; else env[key] = saved[key];
    }
  }
});
