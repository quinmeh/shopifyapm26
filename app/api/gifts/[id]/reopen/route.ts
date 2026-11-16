import { getGift, saveGift } from "@/lib/store";
import { ownsGift, sameOrigin } from "@/lib/giver-auth";

export async function POST(_req: Request, ctx: RouteContext<"/api/gifts/[id]/reopen">) {
  if (!sameOrigin(_req)) return new Response("Invalid origin", { status: 403 });
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (!await ownsGift(gift)) return Response.json({ error: "Giver access required" }, { status: 403 });
  if (gift.status === "completed") return Response.json({ error: "Checkout was already opened." }, { status: 409 });
  const next = { ...gift, status: "sent" as const, confirmation: undefined };
  await saveGift(next);
  return Response.json(next);
}
