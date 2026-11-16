// The recipient's view of a gift: no prices anywhere (BRIEF §7), plus the reveal headline.
import { occasionProfile } from "./occasions";
import { stripPrice } from "./snapshot";
import type { Gift, RecipientGift } from "./types";

export function toRecipientGift(gift: Gift): RecipientGift {
  return {
    ...gift,
    pick: stripPrice(gift.pick),
    approvedSwaps: gift.approvedSwaps.map(stripPrice),
    headline: occasionProfile(gift.occasion ?? "").headline,
  };
}

export const possessive = (name: string) => (name.endsWith("s") ? `${name}’` : `${name}’s`);
