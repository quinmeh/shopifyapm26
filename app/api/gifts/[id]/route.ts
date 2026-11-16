// Read a gift. `?for=recipient` returns the price-free view (BRIEF §7).
import { getGift } from "@/lib/store";
import { stripPrice } from "@/lib/snapshot";
import type { RecipientGift } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });

  if (new URL(req.url).searchParams.get("for") === "recipient") {
    const view: RecipientGift = { ...gift, pick: stripPrice(gift.pick), approvedSwaps: gift.approvedSwaps.map(stripPrice) };
    return Response.json(view);
  }
  return Response.json(gift);
}
