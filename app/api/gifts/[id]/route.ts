// Read a gift. `?for=recipient` returns the price-free view (BRIEF §7).
import { toRecipientGift } from "@/lib/recipient";
import { getGift } from "@/lib/store";
import { ownsGift } from "@/lib/giver-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/gifts/[id]">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (new URL(req.url).searchParams.get("for") === "recipient") return Response.json(toRecipientGift(gift));
  if (!await ownsGift(gift)) return Response.json({ error: "Sign in with the giver’s verified email." }, { status: 403 });
  return Response.json(gift);
}
