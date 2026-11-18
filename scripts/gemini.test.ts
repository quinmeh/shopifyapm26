import assert from "node:assert/strict";
import { test } from "node:test";
import { photoReader, readPhotoWithGemini } from "../lib/gemini";

const input = { system: "s", mediaType: "image/jpeg", data: "AAAA", occasion: "A birthday" };
const reply = (status: number, body: unknown) => (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as unknown as typeof fetch;
const ok = (obj: unknown) => reply(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] }, finishReason: "STOP" }] });

test("sends the photo, schema and key, and returns cleaned cues", async () => {
  let sent: { url: string; init: RequestInit } | null = null;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    sent = { url, init };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ read: "Cozy desk days.", cues: [{ label: " Ramen Bowl", query: "ramen bowl gift set" }, { label: "plush", query: "cute plush toy gift" }] }) }] } }] }));
  }) as unknown as typeof fetch;
  const out = await readPhotoWithGemini(input, { apiKey: "k", model: "m", fetchImpl });
  assert.deepEqual(out, { read: "Cozy desk days.", cues: [{ label: "ramen bowl", query: "ramen bowl gift set" }, { label: "plush", query: "cute plush toy gift" }] });
  assert.match(sent!.url, /models\/m:generateContent$/);
  assert.equal((sent!.init.headers as Record<string, string>)["x-goog-api-key"], "k");
  const body = JSON.parse(sent!.init.body as string);
  assert.equal(body.contents[0].parts[0].inline_data.data, "AAAA");
  assert.equal(body.generationConfig.responseMimeType, "application/json");
});
test("keeps at most five cues", async () => {
  const cues = Array.from({ length: 7 }, (_, i) => ({ label: `c${i}`, query: `q${i}` }));
  const out = await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: ok({ read: "r", cues }) });
  assert.ok("cues" in out && out.cues.length === 5);
});
test("maps provider failures to graceful reasons", async () => {
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: reply(429, "quota") }), { unavailable: "rate_limited" });
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: reply(400, "API key not valid. API_KEY_INVALID") }), { unavailable: "bad_key" });
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: reply(500, "boom"), retryDelaysMs: [] }), { unavailable: "error" });
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: reply(200, { promptFeedback: { blockReason: "SAFETY" } }) }), { unavailable: "refused" });
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: ok({ read: "r", cues: [] }) }), { unavailable: "refused" });
});
test("retries brief overloads, then succeeds", async () => {
  let calls = 0;
  const good = { candidates: [{ content: { parts: [{ text: JSON.stringify({ read: "r", cues: [{ label: "a", query: "q" }] }) }] } }] };
  const fetchImpl = (async () => (++calls < 3 ? new Response("high demand", { status: 503 }) : new Response(JSON.stringify(good)))) as unknown as typeof fetch;
  const out = await readPhotoWithGemini(input, { apiKey: "k", fetchImpl, retryDelaysMs: [1, 1] });
  assert.equal(calls, 3);
  assert.ok("cues" in out && out.cues[0].label === "a");
  calls = 0;
  const always = (async () => { calls++; return new Response("high demand", { status: 503 }); }) as unknown as typeof fetch;
  assert.deepEqual(await readPhotoWithGemini(input, { apiKey: "k", fetchImpl: always, retryDelaysMs: [1, 1] }), { unavailable: "error" });
  assert.equal(calls, 3);
});
test("prefers Claude, then Gemini, then off", () => {
  const saved = { a: process.env.ANTHROPIC_API_KEY, g: process.env.GEMINI_API_KEY };
  try {
    process.env.ANTHROPIC_API_KEY = "a"; process.env.GEMINI_API_KEY = "g"; assert.equal(photoReader(), "claude");
    delete process.env.ANTHROPIC_API_KEY; assert.equal(photoReader(), "gemini");
    delete process.env.GEMINI_API_KEY; assert.equal(photoReader(), "off");
  } finally {
    if (saved.a === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = saved.a;
    if (saved.g === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = saved.g;
  }
});
