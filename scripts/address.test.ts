import assert from "node:assert/strict";
import { test } from "node:test";
import { censusMatches, parseShippingAddress } from "../lib/address";
import { POST as search } from "../app/api/address-search/route";
import { POST as confirm } from "../app/api/gifts/[id]/confirm/route";
import { getGift, saveGift } from "../lib/store";
import { take } from "../lib/private-store";
import type { Gift } from "../lib/types";

const address = { fullName: "  Test Recipient  ", line1: " 4600 Silver Hill Rd ", line2: " Unit 2 ", city: " Washington ", region: " dc ", postalCode: "20233", country: "US" };
const match = { matchedAddress: "4600 SILVER HILL RD, WASHINGTON, DC, 20233", addressComponents: { fromAddress: "4500", toAddress: "4700", city: "WASHINGTON", state: "DC", zip: "20233" } };
const payload = { result: { addressMatches: [match] } };

test("shipping details retain name and unit and normalize whitespace and state", () => {
  assert.deepEqual(parseShippingAddress(address), { fullName: "Test Recipient", line1: "4600 Silver Hill Rd", line2: "Unit 2", city: "Washington", region: "DC", postalCode: "20233", country: "US" });
  assert.equal(parseShippingAddress({ ...address, fullName: "Cher", line2: undefined, postalCode: "20233-1234" })?.fullName, "Cher");
});

test("new confirmations require a name and complete US address", () => {
  for (const input of [null, [], {}, { ...address, fullName: " " }, { ...address, fullName: 123 }, { ...address, line1: "" }, { ...address, city: "" }, { ...address, region: "Washington" }, { ...address, postalCode: "123" }, { ...address, country: "CA" }, { ...address, line2: "x".repeat(121) }]) {
    assert.equal(parseShippingAddress(input), null);
  }
});

test("Census mapping preserves matched house number, removes duplicates and skips incomplete results", () => {
  assert.deepEqual(censusMatches({ result: { addressMatches: [null, {}, match, match, { ...match, addressComponents: { ...match.addressComponents, zip: "" } }] } }), [{ line1: "4600 SILVER HILL RD", city: "WASHINGTON", region: "DC", postalCode: "20233" }]);
  assert.deepEqual(censusMatches({}), []);
  assert.deepEqual(censusMatches({ result: { addressMatches: [] } }), []);
});

test("lookup route supports recipient access, provider failure, rate limits and safe requests", async () => {
  const gift: Gift = { id: "address-search-test", createdAt: "now", giverName: "Giver", recipientLabel: "friend", note: "Enjoy", status: "sent", pick: { id: "p", title: "Mug", shortName: "mug", priceCents: 1000 }, approvedSwaps: [] };
  await saveGift(gift);
  const previousFetch = globalThis.fetch;
  const origin = new URL(process.env.APP_URL || "http://localhost:3000").origin;
  const request = (body: unknown, source = origin) => new Request(`${origin}/api/address-search`, { method: "POST", headers: { origin: source, "content-type": "application/json" }, body: JSON.stringify(body) });
  const body = { giftId: gift.id, query: "4600 Silver Hill Rd Washington DC" };
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://geocoding.geo.census.gov");
    assert.equal(url.searchParams.get("address"), body.query);
    assert.equal(url.searchParams.get("benchmark"), "Public_AR_Current");
    assert.equal(init?.cache, "no-store");
    return Response.json(payload);
  };
  try {
    assert.equal((await search(request(body, "https://foreign.example"))).status, 403);
    assert.equal((await search(request(null))).status, 400);
    assert.equal((await search(request({ ...body, query: "x" }))).status, 400);
    assert.equal((await search(request({ ...body, giftId: "missing-gift" }))).status, 404);
    assert.equal(calls, 0);
    const response = await search(request(body));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual((await response.json()).matches, censusMatches(payload));
    assert.equal((await search(request(body))).status, 429);
    assert.equal(calls, 1);
    await take(`address-search:${gift.id}`);
    globalThis.fetch = async () => { throw new Error("Provider unavailable"); };
    const failure = await search(request(body));
    assert.equal(failure.status, 502);
    assert.match((await failure.json()).error, /enter the address/);
  } finally { globalThis.fetch = previousFetch; await take(`address-search:${gift.id}`); }
});

test("confirmation route rejects missing name, saves name and unit, and retains idempotency", async () => {
  const gift: Gift = { id: "address-confirm-test", createdAt: "now", giverName: "Giver", recipientLabel: "friend", note: "Enjoy", status: "sent", pick: { id: "p", title: "Mug", shortName: "mug", priceCents: 1000 }, approvedSwaps: [] };
  await saveGift(gift);
  const context = { params: Promise.resolve({ id: gift.id }) };
  const request = (a: unknown) => new Request("http://localhost:3000/api/gifts/address-confirm-test/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chosenProductId: "p", variantId: "v", address: a }) });
  assert.equal((await confirm(request({ ...address, fullName: "" }), context)).status, 400);
  assert.equal((await getGift(gift.id))?.confirmation, undefined);
  assert.equal((await confirm(request(address), context)).status, 200);
  assert.deepEqual((await getGift(gift.id))?.confirmation?.address, parseShippingAddress(address));
  assert.equal((await confirm(request({ ...address, fullName: "Changed" }), context)).status, 200);
  assert.equal((await getGift(gift.id))?.confirmation?.address?.fullName, "Test Recipient");
});
