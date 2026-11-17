import assert from "node:assert/strict";
import { test } from "node:test";
import { checkCheckout } from "../lib/checkout";
import type { Gift } from "../lib/types";
import type { CatalogProduct } from "../lib/catalog";

const gift: Gift = {
  id: "test", createdAt: "2026-11-16", giverName: "Giver", recipientLabel: "your friend", note: "Enjoy", status: "confirmed",
  pick: { id: "product", title: "Mug", shortName: "the mug", priceCents: 4000 }, approvedSwaps: [],
  confirmation: { chosenProductId: "product", variantId: "blue", variantTitle: "Blue", selected: [{ name: "Color", label: "Blue" }],
    address: { line1: "1 Test St", city: "Seattle", region: "WA", postalCode: "98101", country: "US" }, confirmedAt: "2026-11-16" },
};
function product(): CatalogProduct {
  return { id: "product", variants: [{ id: "blue", price: { amount: 4000, currency: "USD" }, availability: { available: true }, checkout_url: "https://example.com/checkout" }] };
}
test("rechecks exact selections and preserves unchanged price", async () => {
  const result = await checkCheckout(gift, async args => {
    assert.deepEqual(args, { id: "product", selected: [{ name: "Color", label: "Blue" }] }); return product();
  });
  assert.equal(result.priceChanged, false); assert.equal(result.soldOut, false); assert.equal(result.newCents, 4000);
  assert.equal(result.checkoutUrl, "https://example.com/checkout");
});
test("detects a price increase or decrease", async () => {
  for (const amount of [4500, 3500]) {
    const p = product(); p.variants![0].price!.amount = amount;
    const result = await checkCheckout(gift, async () => p);
    assert.equal(result.priceChanged, true); assert.equal(result.newCents, amount);
  }
});
test("sold out never exposes a checkout link", async () => {
  const p = product(); p.variants![0].availability!.available = false;
  const result = await checkCheckout(gift, async () => p);
  assert.equal(result.soldOut, true); assert.equal(result.checkoutUrl, null);
});
test("does not substitute a default variant", async () => {
  const p = product(); p.variants![0].id = "red";
  await assert.rejects(checkCheckout(gift, async () => p), /could not be resolved/);
});
test("unknown stock, missing prices, and unsafe checkout URLs fail closed", async () => {
  const stock = product(); delete stock.variants![0].availability;
  await assert.rejects(checkCheckout(gift, async () => stock), /Stock could not be verified/);
  const price = product(); delete price.variants![0].price;
  await assert.rejects(checkCheckout(gift, async () => price), /USD price/);
  const url = product(); url.variants![0].checkout_url = "javascript:alert(1)";
  await assert.rejects(checkCheckout(gift, async () => url), /checkout link/);
});
test("external merchants are never offered a checkout link", async () => {
  const p = product(); p.variants![0].source = "external"; delete p.variants![0].checkout_url;
  await assert.rejects(checkCheckout(gift, async () => p), /isn’t sold through a Shopify store/);
});
test("unconfirmed gifts cannot be checked", async () => {
  await assert.rejects(checkCheckout({ ...gift, confirmation: undefined }), /not confirmed/);
});
