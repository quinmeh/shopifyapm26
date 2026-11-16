// Read a gift. `?for=recipient` returns the price-free view (BRIEF §7).
import { toRecipientGift } from "@/lib/recipient";
import { getGift } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("for") === "recipient") return Response.json(toRecipientGift(gift));
  return Response.json(gift);
}
