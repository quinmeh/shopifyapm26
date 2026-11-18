// Giver cancels a gift: the recipient link stops working and any stored photo is deleted.
// Purchases already made at the merchant are not affected (the app never charges anyone).
import { ownsGift, sameOrigin } from "@/lib/giver-auth";
import { giftPhotoKey } from "@/lib/gift-photo";
import { put, take } from "@/lib/private-store";
import { getGift, saveGift } from "@/lib/store";

export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/cancel">) {
  if (!sameOrigin(req)) return Response.json({ error: "Please reload this page and try again." }, { status: 403 });
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await ownsGift(gift)) return Response.json({ error: "Giver access required" }, { status: 403 });
  if (gift.status === "cancelled") return Response.json(gift);
  const lock = `confirm-lock:${id}`; // same lock as confirm/reopen/checkout, so they can't interleave
  if (!await put(lock, true, 60, true)) return Response.json({ error: "The gift is updating. Try again." }, { status: 409 });
  try {
    const latest = await getGift(id);
    if (!latest) return Response.json({ error: "Not found" }, { status: 404 });
    const cancelled = { ...latest, status: "cancelled" as const, cancelledAt: new Date().toISOString(), hasPhoto: false };
    await saveGift(cancelled);
    if (latest.hasPhoto) await take(giftPhotoKey(id));
    console.log(`[api/gifts/${id}/cancel] cancelled (was ${latest.status})`);
    return Response.json(cancelled);
  } finally { await take(lock); }
}
