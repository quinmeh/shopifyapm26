import assert from "node:assert/strict";
import { test } from "node:test";
import { consumeLogin, digest, issueLogin, safeReturn, sameOrigin } from "../lib/giver-auth";
import { put, take } from "../lib/private-store";
import { queueConfirmation, retryNotifications } from "../lib/notifications";
import { toRecipientGift } from "../lib/recipient";
import type { Gift } from "../lib/types";

test("origin checks reject opaque and foreign origins while allowing local same-site aliases", () => {
  const environment = process.env as Record<string, string | undefined>;
  const previousMode = environment.NODE_ENV, previousUrl = environment.APP_URL;
  environment.NODE_ENV = "development"; environment.APP_URL = "http://localhost:3000";
  const request = (origin?: string, url = "http://127.0.0.1:3000/api/auth/verify") => new Request(url, { headers: origin ? { origin } : {} });
  try {
    assert.equal(sameOrigin(request("http://localhost:3000")), true);
    assert.equal(sameOrigin(request("http://127.0.0.1:3000")), true);
    assert.equal(sameOrigin(request("http://127.0.0.1:4000")), false);
    assert.equal(sameOrigin(request("http://evil.example")), false);
    assert.equal(sameOrigin(request("null")), false);
    assert.equal(sameOrigin(request()), false);
    assert.equal(sameOrigin(request("malformed")), false);
    environment.NODE_ENV = "production"; environment.APP_URL = "https://gift.example";
    assert.equal(sameOrigin(request("http://127.0.0.1:3000")), false);
    assert.equal(sameOrigin(request("https://gift.example")), true);
  } finally {
    if (previousMode === undefined) delete environment.NODE_ENV; else environment.NODE_ENV = previousMode;
    if (previousUrl === undefined) delete environment.APP_URL; else environment.APP_URL = previousUrl;
  }
});

test("login links are single-use, expire, and reject external redirects", async () => {
  const url = new URL(await issueLogin("test@example.invalid", "https://evil.example"));
  const token = url.searchParams.get("token")!;
  const login = await consumeLogin(token);
  assert.equal(login?.returnTo, "/gifts");
  assert.equal(await consumeLogin(token), null);
  const expired = "a".repeat(43);
  await put(`login:${digest(expired)}`, { email: "test@example.invalid" }, -1);
  assert.equal(await consumeLogin(expired), null);
  assert.equal(safeReturn("//evil.example"), "/gifts");
  assert.equal(safeReturn("/gift/abc"), "/gift/abc");
});
test("concurrent rate-limit claims allow exactly one request", async () => {
  const result = await Promise.all(Array.from({ length: 10 }, () => put("test-lock", true, 60, true)));
  assert.equal(result.filter(Boolean).length, 1);
});
test("confirmation email retries use a stable key and exclude private address", async () => {
  const gift: Gift = { id: "email-test", createdAt: "now", giverName: "Giver", ownerEmail: "giver@example.invalid", recipientLabel: "your friend", note: "Hello", status: "confirmed",
    pick: { id: "pick", title: "Mug", shortName: "mug", priceCents: 4000 }, approvedSwaps: [],
    confirmation: { chosenProductId: "pick", variantId: "v", variantTitle: "M", confirmedAt: "test", address: { line1: "Private Street", city: "Seattle", region: "WA", postalCode: "98101", country: "US" } } };
  const recipient = toRecipientGift(gift);
  assert.ok(!JSON.stringify(recipient).includes("ownerEmail")); assert.ok(!JSON.stringify(recipient).includes("priceCents"));
  const originalFetch = globalThis.fetch;
  const oldKey = process.env.RESEND_API_KEY, oldFrom = process.env.EMAIL_FROM;
  process.env.RESEND_API_KEY = "test-key"; process.env.EMAIL_FROM = "test@example.invalid";
  const calls: { body: string; key: string }[] = [];
  globalThis.fetch = async (_url, init) => {
    calls.push({ body: String(init?.body), key: new Headers(init?.headers).get("Idempotency-Key")! });
    return new Response("{}", { status: calls.length === 1 ? 500 : 200 });
  };
  try {
    await queueConfirmation(gift);
    await take(`notification-lock:confirmation-${digest("email-test:test")}`);
    await retryNotifications();
    await queueConfirmation(gift);
    assert.equal(calls.length, 2); assert.deepEqual(calls[0], calls[1]);
    assert.ok(!calls[0].body.includes("Private Street"));
    assert.ok(calls[0].body.includes("/gift/email-test"));
  } finally {
    globalThis.fetch = originalFetch;
    if (oldKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = oldKey;
    if (oldFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = oldFrom;
  }
});
