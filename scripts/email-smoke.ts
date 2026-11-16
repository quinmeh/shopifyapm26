import assert from "node:assert/strict";
const base = "http://localhost:3000";
const email = `giver-${Date.now()}@example.invalid`;
async function post(path: string, body: unknown, cookie = "") {
  return fetch(base + path, { method: "POST", headers: { Origin: base, Cookie: cookie, "Content-Type": "application/json" }, body: JSON.stringify(body), redirect: "manual" });
}
async function main() {
  const requested = await post("/api/auth/request", { email });
  assert.equal(requested.status, 200);
  assert.equal((await requested.json()).preview, true, "This test must only run with development preview enabled.");
  assert.equal((await post("/api/auth/request", { email })).status, 429);
  const inbox = await (await fetch(base + "/dev/mail")).text();
  // Latest preview is first; extract only the high-entropy login token, without logging it.
  const token = inbox.match(/auth\/verify\?token=([A-Za-z0-9_-]{43})/)?.[1];
  assert.ok(token);
  assert.equal((await fetch(`${base}/auth/verify?token=${token}`)).status, 200);
  const verify = () => fetch(base + "/api/auth/verify", { method: "POST", headers: { Origin: base }, body: new URLSearchParams({ token }), redirect: "manual" });
  const verified = await verify();
  assert.equal(verified.status, 303);
  assert.ok(verified.headers.get("location")?.endsWith("/gifts"));
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  assert.match(verified.headers.get("set-cookie")!, /HttpOnly/i);
  assert.ok((await verify()).headers.get("location")?.includes("expired=1"));
  const session = await (await fetch(base + "/api/auth/session", { headers: { Cookie: cookie } })).json();
  assert.equal(session.email, email);
  const body = { recipientLabel: "your friend", note: "Email smoke test", pick: { id: "gid://shopify/p/test", title: "Test mug", priceCents: 4000, shortName: "the mug" } };
  assert.equal((await post("/api/gifts", body)).status, 401);
  const created = await post("/api/gifts", body, cookie);
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.equal(id.length, 24);
  assert.equal((await fetch(`${base}/api/gifts/${id}`)).status, 403);
  assert.equal((await post(`/api/gifts/${id}/checkout`, {})).status, 403);
  assert.equal((await post(`/api/gifts/${id}/reopen`, {})).status, 403);
  const privatePage = await fetch(`${base}/gift/${id}`, { redirect: "manual" });
  assert.ok([307, 308].includes(privatePage.status));
  const recipient = await (await fetch(`${base}/api/gifts/${id}?for=recipient`)).json();
  assert.ok(!JSON.stringify(recipient).includes(email));
  assert.ok(!JSON.stringify(recipient).includes("priceCents"));
  const confirm = { chosenProductId: body.pick.id, variantId: "test-variant", address: { line1: "123 Private Test Street", city: "Seattle", region: "WA", postalCode: "98101" } };
  assert.equal((await post(`/api/gifts/${id}/confirm`, confirm)).status, 200);
  assert.equal((await post(`/api/gifts/${id}/confirm`, confirm)).status, 200);
  const after = await (await fetch(base + "/dev/mail")).text();
  assert.ok(after.includes(`/gift/${id}`));
  assert.ok(!after.includes("123 Private Test Street"));
  // The private list is accessible only with the verified cookie.
  const list = await fetch(base + "/gifts", { headers: { Cookie: cookie } });
  assert.equal(list.status, 200); assert.ok((await list.text()).includes(`/gift/${id}`));
  assert.equal((await fetch(base + "/api/jobs/notifications")).status, 401);
  assert.equal((await fetch(base + "/api/auth/session", { method: "DELETE", headers: { Cookie: cookie, Origin: base } })).status, 200);
  assert.equal((await fetch(`${base}/api/gifts/${id}`, { headers: { Cookie: cookie } })).status, 403);
  console.log("Email flow passed: verification, expiry/replay protection, rate limit, ownership, recipient privacy, confirmation notification, recovery list, logout.");
}
main().catch(e => { console.error(e); process.exitCode = 1; });
