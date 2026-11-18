import { getProduct, refundPolicyUrl, shopifyCheckoutUrl } from "./catalog";
import type { Gift } from "./types";

export type CheckoutCheck = {
  checkoutUrl: string | null; priceChanged: boolean; oldCents: number; newCents: number | null;
  soldOut: boolean; checkedAt: string; sellerName?: string; refundPolicyUrl?: string;
};

export async function checkCheckout(gift: Gift, lookup = getProduct): Promise<CheckoutCheck> {
  const c = gift.confirmation;
  if (!c) throw new Error("The recipient has not confirmed yet.");
  const chosen = [gift.pick, ...gift.approvedSwaps].find(p => p.id === c.chosenProductId);
  if (!chosen) throw new Error("The chosen item is not approved.");
  const product = await lookup({ id: chosen.id, selected: c.selected });
  if (!product) throw new Error("This item could not be checked. Please try again.");
  const variant = product.variants?.find(v => v.id === c.variantId);
  // Never substitute the default variant for the recipient's selection.
  if (!variant) throw new Error("The selected variant could not be resolved. Ask them to choose again.");
  if (typeof variant.availability?.available !== "boolean") throw new Error("Stock could not be verified. Please try again.");
  const soldOut = !variant.availability.available;
  const amount = variant.price?.amount;
  const newCents = typeof amount === "number" && Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
  if (!soldOut && (newCents === null || variant.price?.currency !== "USD")) throw new Error("A current USD price could not be verified.");
  if (!soldOut && variant.source && variant.source !== "shopify") throw new Error("This item isn’t sold through a Shopify store, so it can’t be bought here. Use “Ask them to choose again” so they can pick another option.");
  const checkoutUrl = soldOut ? null : shopifyCheckoutUrl(variant);
  if (!soldOut && !checkoutUrl) throw new Error("This shop did not provide a checkout link. Please try again later.");
  return { checkoutUrl, priceChanged: newCents !== null && newCents !== chosen.priceCents,
    oldCents: chosen.priceCents, newCents, soldOut, checkedAt: new Date().toISOString(),
    sellerName: variant.seller?.name ?? chosen.sellerName, refundPolicyUrl: refundPolicyUrl(variant.seller) ?? chosen.refundPolicyUrl };
}
