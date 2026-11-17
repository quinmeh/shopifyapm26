import assert from "node:assert/strict";

const base = "http://127.0.0.1:3000";
// Creation issues browser access immediately; an existing session is optional.
let cookie = process.env.GIVER_SESSION_COOKIE ?? "";
const origin = process.env.APP_URL ?? "http://localhost:3000";
const get = (path: string) => fetch(base + path, { headers: { Cookie: cookie } });
async function post(path: string, body: unknown = {}) {
  return fetch(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json", Cookie: cookie, Origin: origin }, body: JSON.stringify(body) });
}
async function main() {
  const created = await post("/api/gifts", { recipientLabel: "your test recipient", note: "M4 smoke test", pick: { id: "gid://shopify/p/m4-test", title: "Test item", shortName: "the test item", priceCents: 4000 } });
  assert.equal(created.status, 201);
  const browserCookie = created.headers.get("set-cookie")?.split(";")[0];
  if (browserCookie) cookie = [cookie, browserCookie].filter(Boolean).join("; ");
  const { id } = await created.json();
  const page = await get(`/gift/${id}`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Waiting for/);
  assert.equal((await post(`/api/gifts/${id}/checkout`)).status, 409);
  const confirmation = { chosenProductId: "gid://shopify/p/m4-test", variantId: "test-variant", selected: [{ name: "Size", label: "M" }], address: { fullName: "Test Recipient", line1: "1 Test Street", line2: "Apt 4", city: "Seattle", region: "WA", postalCode: "98101" } };
  assert.equal((await post(`/api/gifts/${id}/confirm`, { ...confirmation, address: { ...confirmation.address, fullName: "" } })).status, 400);
  assert.equal((await post(`/api/gifts/${id}/confirm`, confirmation)).status, 200);
  const data = await (await fetch(`${base}/api/gifts/${id}?for=recipient`)).json();
  assert.deepEqual(data.confirmation.selected, confirmation.selected);
  assert.equal(data.confirmation.address.fullName, "Test Recipient");
  assert.equal(data.confirmation.address.line2, "Apt 4");
  assert.ok(!JSON.stringify(data).includes("priceCents"));
  const confirmedPage = await get(`/gift/${id}`);
  assert.equal(confirmedPage.status, 200);
  assert.match(await confirmedPage.text(), /loved your pick/);
  assert.equal((await post(`/api/gifts/${id}/checkout`, null)).status, 400);
  const reopened = await post(`/api/gifts/${id}/reopen`);
  assert.equal(reopened.status, 200);
  const reset = await reopened.json();
  assert.equal(reset.status, "sent"); assert.equal(reset.confirmation, undefined);
  assert.equal((await post(`/api/gifts/${id}/checkout`)).status, 409);
  console.log("M4 routes pass: waiting, confirmed, saved options, recipient privacy, malformed checkout, reopen.");
  if (process.argv.includes("--live")) {
    const productId = "gid://shopify/p/684C4zXgYDhvHEh2P7I6nE";
    const lookup = await fetch(`${base}/api/product/${encodeURIComponent(productId)}`);
    assert.equal(lookup.status, 200);
    const { product, variant } = await lookup.json();
    const liveCreated = await post("/api/gifts", { recipientLabel: "your test recipient", note: "M4 live catalog verification", pick: { ...product, priceCents: variant.priceCents - 100 } });
    const liveId = (await liveCreated.json()).id;
    assert.equal((await post(`/api/gifts/${liveId}/confirm`, { ...confirmation, chosenProductId: productId, variantId: variant.id, selected: variant.options })).status, 200);
    const checked = await post(`/api/gifts/${liveId}/checkout`);
    assert.equal(checked.status, 200);
    const result = await checked.json();
    assert.equal(result.priceChanged, true); assert.equal(result.soldOut, false); assert.ok(result.checkoutUrl.startsWith("https://"));
    const stale = await post(`/api/gifts/${liveId}/checkout`, { proceed: true, acceptedCents: -1 });
    assert.equal((await stale.json()).proceed, false);
    const accepted = await post(`/api/gifts/${liveId}/checkout`, { proceed: true, acceptedCents: result.newCents });
    assert.equal((await accepted.json()).proceed, true);
    assert.equal((await post(`/api/gifts/${liveId}/reopen`)).status, 409);
    console.log("Live catalog check passes: exact variant, price-change acceptance, stale-price block, simulated click-through. No merchant checkout was opened.");
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
