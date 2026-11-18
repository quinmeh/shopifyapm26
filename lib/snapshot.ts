// Catalog product → the small ProductSnapshot we store on a gift and send to the UI.
import {
  productImageUrl,
  productPriceCents,
  productSeller,
  productUrl,
  refundPolicyUrl,
  type CatalogProduct,
} from "./catalog";
import type { ProductSnapshot, RecipientProduct } from "./types";

// Product nouns sit at the end of titles: "The Lookout Deluxe Cat Window Bed" → "the window bed",
// "Key To New Home Engraved Candle" → "the engraved candle". Takes the last two meaningful words
// of the title's first segment (before " - ", " | ", commas, parentheses).
export function shortName(title: string): string {
  const head = title.split(/\s+[-–|•·]\s+|,|\(/)[0].trim();
  const words = head
    .split(/\s+/)
    .filter((w) => !/^(for|with|and|&|the|a|an|in|of|by|to|new|personalised|personalized|custom)$/i.test(w))
    .slice(-2)
    .map((w) => (w === w.toUpperCase() && w.length > 1 ? w : w.toLowerCase()));
  return words.length ? `the ${words.join(" ")}` : "this gift";
}

export function toSnapshot(p: CatalogProduct): ProductSnapshot {
  const seller = productSeller(p);
  const title = p.title ?? "Untitled";
  return {
    id: p.id,
    title,
    shortName: shortName(title),
    imageUrl: productImageUrl(p),
    priceCents: productPriceCents(p) ?? 0,
    sellerName: seller?.name,
    sellerUrl: seller?.url ?? productUrl(p),
    refundPolicyUrl: refundPolicyUrl(seller),
    rating: p.rating?.value !== undefined ? { value: p.rating.value, count: p.rating.count ?? 0 } : undefined,
  };
}

// BRIEF §7: recipient-facing responses must not include prices.
export function stripPrice(s: ProductSnapshot): RecipientProduct {
  const { priceCents: _omit, ...rest } = s;
  void _omit;
  return rest;
}
