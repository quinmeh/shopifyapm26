import { checkCheckout } from "@/lib/checkout";
import { ownsGift, sameOrigin } from "@/lib/giver-auth";
import { getGift, saveGift } from "@/lib/store";
import { put, take } from "@/lib/private-store";

export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/checkout">) {
  if (!sameOrigin(req)) return new Response("Invalid origin", { status: 403 });
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await ownsGift(gift)) return Response.json({ error: "Giver access required" }, { status: 403 });
  if (!gift.confirmation) return Response.json({ error: "Waiting for confirmation" }, { status: 409 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Invalid body" }, { status: 400 });
  try {
    const check = await checkCheckout(gift);
    // A click-through is only recorded after a fresh check and explicit acceptance of this price.
    if (body.proceed === true && !check.soldOut && body.acceptedCents === check.newCents) {
      const lock = `confirm-lock:${id}`;
      if (!await put(lock, true, 60, true)) return Response.json({ error: "The gift is updating. Try again." }, { status: 409 });
      try {
        const latest = await getGift(id);
        if (!latest || JSON.stringify(latest.confirmation) !== JSON.stringify(gift.confirmation)) return Response.json({ error: "The choice changed. Refresh this page." }, { status: 409 });
        await saveGift({ ...latest, status: "completed" });
      } finally { await take(lock); }
      return Response.json({ ...check, proceed: true });
    }
    return Response.json({ ...check, proceed: false });
  } catch (error) {
    console.error("[checkout]", error);
    return Response.json({ error: error instanceof Error ? error.message : "Could not check checkout." }, { status: 502 });
  }
}
