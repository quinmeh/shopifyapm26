// Create a gift (BRIEF §3 G3). Returns { id } for the /g/[id] link.
import { nanoid } from "nanoid";
import { digest, ensureGiverBrowser, giverEmail, sameOrigin } from "@/lib/giver-auth";
import { addMember } from "@/lib/private-store";
import { saveGift } from "@/lib/store";
import type { DeliveryMethod, Gift, ProductSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = {
  recipientLabel?: string;
  occasion?: string;
  note?: string;
  pick?: ProductSnapshot;
  approvedSwaps?: ProductSnapshot[];
  deliveryMethod?: DeliveryMethod;
};

const isSnapshot = (p: unknown): p is ProductSnapshot =>
  !!p && typeof p === "object" && typeof (p as ProductSnapshot).id === "string" &&
  typeof (p as ProductSnapshot).title === "string" && typeof (p as ProductSnapshot).priceCents === "number";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Invalid origin", { status: 403 });
  const ownerEmail = await giverEmail();
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") return Response.json({ error: "Invalid request" }, { status: 400 });
  if (body.deliveryMethod !== undefined && body.deliveryMethod !== "ship_to_recipient" && body.deliveryMethod !== "give_in_person") {
    return Response.json({ error: "Choose how you would like to give this gift." }, { status: 400 });
  }
  const note = (body.note ?? "").trim();
  const recipientLabel = (body.recipientLabel ?? "").trim();
  if (!isSnapshot(body.pick)) return Response.json({ error: "pick required" }, { status: 400 });
  if (!note) return Response.json({ error: "note required" }, { status: 400 });
  if (!recipientLabel) return Response.json({ error: "recipientLabel required" }, { status: 400 });
  const approvedSwaps = (body.approvedSwaps ?? []).filter(isSnapshot).slice(0, 3);

  const gift: Gift = {
    id: nanoid(24),
    ownerEmail: ownerEmail ?? undefined,
    ownerBrowserId: await ensureGiverBrowser(),
    createdAt: new Date().toISOString(),
    giverName: process.env.NEXT_PUBLIC_GIVER_NAME || "Your friend",
    recipientLabel,
    occasion: (body.occasion ?? "").trim() || undefined,
    note: note.slice(0, 500),
    deliveryMethod: body.deliveryMethod ?? "ship_to_recipient",
    pick: body.pick,
    approvedSwaps,
    status: "sent",
  };
  await saveGift(gift);
  await addMember(`browser-gifts:${gift.ownerBrowserId}`, gift.id);
  if (ownerEmail) await addMember(`giver-gifts:${digest(ownerEmail)}`, gift.id);
  console.log(`[api/gifts] created ${gift.id}: "${gift.pick.title}" + ${approvedSwaps.length} swaps for ${recipientLabel}`);
  return Response.json({ id: gift.id }, { status: 201 });
}
