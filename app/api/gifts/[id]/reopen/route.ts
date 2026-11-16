import { getGift, saveGift } from "@/lib/store";

export async function POST(_req: Request, ctx: RouteContext<"/api/gifts/[id]/reopen">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (gift.status === "completed") return Response.json({ error: "Checkout was already opened." }, { status: 409 });
  const next = { ...gift, status: "sent" as const, confirmation: undefined };
  await saveGift(next);
  return Response.json(next);
}
