// Header badge: how many gifts this giver has, and how many are still waiting on the recipient.
import { ownedGifts } from "@/lib/my-gifts";

export const dynamic = "force-dynamic";

export async function GET() {
  const { gifts } = await ownedGifts();
  const active = gifts.filter((g) => g.status !== "cancelled");
  return Response.json(
    { total: active.length, waiting: active.filter((g) => g.status === "sent").length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
