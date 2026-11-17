import { getGift, saveGift } from "@/lib/store";
import { ownsGift, sameOrigin } from "@/lib/giver-auth";
import { put, take } from "@/lib/private-store";

export async function POST(_req: Request, ctx: RouteContext<"/api/gifts/[id]/reopen">) {
  if (!sameOrigin(_req)) return Response.json({ error: "Please reload this page and try again." }, { status: 403 });
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await ownsGift(gift)) return Response.json({ error: "Giver access required" }, { status: 403 });
  if (gift.status === "completed") return Response.json({ error: "Checkout was already opened." }, { status: 409 });
  const lock = `confirm-lock:${id}`;
  if (!await put(lock, true, 60, true)) return Response.json({ error: "The gift is updating. Try again." }, { status: 409 });
  try {
    const latest = await getGift(id);
    if (!latest || latest.status === "completed") return Response.json({ error: "The gift changed. Refresh this page." }, { status: 409 });
    const next = { ...latest, status: "sent" as const, confirmation: undefined };
    await saveGift(next);
    return Response.json(next);
  } finally { await take(lock); }
}
