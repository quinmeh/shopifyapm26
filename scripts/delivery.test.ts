import assert from "node:assert/strict";
import { test } from "node:test";
import { POST as confirm } from "../app/api/gifts/[id]/confirm/route";
import { getGift, saveGift } from "../lib/store";
import { toRecipientGift } from "../lib/recipient";
import { checkCheckout } from "../lib/checkout";
import type { DeliveryMethod, Gift } from "../lib/types";

function gift(id: string, deliveryMethod?: DeliveryMethod): Gift {
  return { id, deliveryMethod, createdAt: "now", giverName: "Giver", recipientLabel: "friend", note: "Enjoy", status: "sent",
    pick: { id: "pick", title: "Mug", shortName: "mug", priceCents: 1000 },
    approvedSwaps: [{ id: "swap", title: "Cup", shortName: "cup", priceCents: 1000 }] };
}
const address = { fullName: "Test Recipient", line1: "1 Test St", city: "Seattle", region: "WA", postalCode: "98101", country: "US" };
const submit = (id: string, extra: Record<string, unknown> = {}) => confirm(new Request(`http://localhost:3000/api/gifts/${id}/confirm`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ chosenProductId: "pick", variantId: "blue", selected: [{ name: "Color", label: "Blue" }], ...extra }),
}), { params: Promise.resolve({ id }) });

test("direct and legacy gifts require an address even if the recipient requests in-person delivery", async () => {
  for (const method of [undefined, "ship_to_recipient"] as const) {
    const original = gift(`delivery-direct-${method}`, method);
    await saveGift(original);
    assert.equal(toRecipientGift(original).deliveryMethod, "ship_to_recipient");
    assert.equal((await submit(original.id, { deliveryMethod: "give_in_person" })).status, 400);
    assert.equal((await getGift(original.id))?.confirmation, undefined);
    assert.equal((await submit(original.id, { address })).status, 200);
    assert.deepEqual((await getGift(original.id))?.confirmation?.address, { ...address, line2: "" });
  }
});

test("in-person confirmation needs no address, supports alternatives, and stays idempotent", async () => {
  const original = gift("delivery-in-person", "give_in_person");
  await saveGift(original);
  assert.equal((await submit(original.id, { chosenProductId: "unapproved" })).status, 400);
  assert.equal((await submit(original.id, { variantId: "" })).status, 400);
  assert.equal((await submit(original.id, { chosenProductId: "swap" })).status, 200);
  const saved = (await getGift(original.id))!;
  assert.equal(saved.status, "confirmed");
  assert.equal(saved.confirmation?.chosenProductId, "swap");
  assert.deepEqual(saved.confirmation?.selected, [{ name: "Color", label: "Blue" }]);
  assert.equal(saved.confirmation?.address, undefined);
  assert.equal(toRecipientGift(saved).deliveryMethod, "give_in_person");
  await submit(original.id, { address, deliveryMethod: "ship_to_recipient" });
  assert.deepEqual(await getGift(original.id), saved);
  const checked = await checkCheckout(saved, async () => ({ id: "swap", variants: [{ id: "blue", price: { amount: 1000, currency: "USD" }, availability: { available: true }, checkout_url: "https://example.com/checkout" }] }));
  assert.equal(checked.checkoutUrl, "https://example.com/checkout");
});

test("in-person confirmation discards unsolicited address details and cannot change delivery", async () => {
  const original = gift("delivery-ignore-address", "give_in_person");
  await saveGift(original);
  assert.equal((await submit(original.id, { address, deliveryMethod: "ship_to_recipient" })).status, 200);
  const saved = (await getGift(original.id))!;
  assert.equal(saved.deliveryMethod, "give_in_person");
  assert.equal(saved.confirmation?.address, undefined);
  assert.ok(!JSON.stringify(toRecipientGift(saved)).includes("1 Test St"));
});
