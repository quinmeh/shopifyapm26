// The recipient's view of a gift: no prices anywhere (BRIEF §7), plus the reveal headline.
import { occasionProfile } from "./occasions";
import { stripPrice } from "./snapshot";
import type { Gift, RecipientGift } from "./types";

export function toRecipientGift(gift: Gift): RecipientGift {
  return {
    id: gift.id, createdAt: gift.createdAt, giverName: gift.giverName,
    recipientLabel: gift.recipientLabel, occasion: gift.occasion, note: gift.note,
    deliveryMethod: gift.deliveryMethod ?? "ship_to_recipient",
    status: gift.status, confirmation: gift.confirmation,
    pick: stripPrice(gift.pick),
    approvedSwaps: gift.approvedSwaps.map(stripPrice),
    headline: occasionProfile(gift.occasion ?? "").headline,
  };
}

export const possessive = (name: string) => (name.endsWith("s") ? `${name}’` : `${name}’s`);
