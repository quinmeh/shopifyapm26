// Read a gift. `?for=recipient` returns the price-free view (BRIEF §7).
import { toRecipientGift } from "@/lib/recipient";
import { deleteGift, getGift } from "@/lib/store";
import { digest, ownsGift, sameOrigin } from "@/lib/giver-auth";
import { giftPhotoKey } from "@/lib/gift-photo";
import { put, removeMember, take } from "@/lib/private-store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("for") === "recipient") {
    if (gift.status === "cancelled") return Response.json({ error: "This gift is no longer available." }, { status: 410 });
    return Response.json(toRecipientGift(gift));
  }
  if (!await ownsGift(gift)) return Response.json({ error: "Sign in with the giver’s verified email." }, { status: 403 });
  return Response.json(gift);
}

// Giver deletes a gift from My gifts: the record, any stored photo, and its list entries.
// The recipient link stops working (it shows the not-found page).
export async function DELETE(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  if (!sameOrigin(req)) return Response.json({ error: "Please reload this page and try again." }, { status: 403 });
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ ok: true }); // already gone
  if (!await ownsGift(gift)) return Response.json({ error: "Giver access required" }, { status: 403 });
  const lock = `confirm-lock:${id}`; // same lock as confirm/reopen/checkout/cancel
  if (!await put(lock, true, 60, true)) return Response.json({ error: "The gift is updating. Try again." }, { status: 409 });
  try {
    await deleteGift(id);
    await take(giftPhotoKey(id));
    if (gift.ownerBrowserId) await removeMember(`browser-gifts:${gift.ownerBrowserId}`, id);
    if (gift.ownerEmail) await removeMember(`giver-gifts:${digest(gift.ownerEmail)}`, id);
    console.log(`[api/gifts/${id}] deleted (was ${gift.status})`);
    return Response.json({ ok: true });
  } finally { await take(lock); }
}

