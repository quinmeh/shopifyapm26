// Gifts this giver can see: everything created in this browser plus anything linked to their
// verified email. Shared by the My gifts page and the header summary.
import { digest, giverBrowserId, giverEmail, ownsGift } from "./giver-auth";
import { members, removeMember } from "./private-store";
import { getGift } from "./store";
import type { Gift } from "./types";

export async function ownedGifts(): Promise<{ email: string | null; browserId: string | null; gifts: Gift[] }> {
  const email = await giverEmail(), browserId = await giverBrowserId();
  const keys = [...(email ? [`giver-gifts:${digest(email)}`] : []), ...(browserId ? [`browser-gifts:${browserId}`] : [])];
  const ids = new Set((await Promise.all(keys.map((key) => members(key)))).flat());
  const gifts: Gift[] = [];
  for (const id of ids) {
    const gift = await getGift(id);
    if (gift && await ownsGift(gift)) gifts.push(gift);
    else if (!gift) for (const key of keys) await removeMember(key, id); // expired
  }
  gifts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { email: email ?? null, browserId: browserId ?? null, gifts };
}
