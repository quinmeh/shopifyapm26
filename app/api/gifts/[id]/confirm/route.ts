// Recipient confirms (BRIEF §3 R1): chosen product (pick or an approved swap), variant, address.
// Idempotent: a second call returns the stored confirmation unchanged.
import { getGift, saveGift } from "@/lib/store";
import { queueConfirmation } from "@/lib/notifications";
import { put, take } from "@/lib/private-store";
import type { Address } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = { chosenProductId?: string; variantId?: string; variantTitle?: string; selected?: { name: string; label: string }[]; address?: Partial<Address> };

const clean = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export async function POST(req: Request, ctx: RouteContext<"/api/gifts/[id]/confirm">) {
  const { id } = await ctx.params;
  const gift = await getGift(id);
  if (!gift) return Response.json({ error: "Not found" }, { status: 404 });
  if (gift.confirmation) {
    await queueConfirmation(gift).catch(() => console.error("[notification] Could not queue; confirmation is saved."));
    return Response.json({ ok: true, alreadyConfirmed: true, confirmation: gift.confirmation });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") return Response.json({ error: "Invalid body" }, { status: 400 });
  if (body.selected !== undefined && (!Array.isArray(body.selected) || body.selected.some(s => !s || typeof s.name !== "string" || typeof s.label !== "string"))) {
    return Response.json({ error: "Invalid selected options" }, { status: 400 });
  }
  const chosenProductId = clean(body.chosenProductId);
  const allowed = [gift.pick.id, ...gift.approvedSwaps.map((s) => s.id)];
  if (!allowed.includes(chosenProductId)) return Response.json({ error: "chosenProductId must be the pick or an approved alternative" }, { status: 400 });

  const variantId = clean(body.variantId);
  if (!variantId) return Response.json({ error: "variantId required" }, { status: 400 });

  const a = body.address ?? {};
  const address: Address = {
    line1: clean(a.line1), city: clean(a.city), region: clean(a.region).toUpperCase(), postalCode: clean(a.postalCode), country: "US",
  };
  if (!address.line1 || !address.city || !/^[A-Z]{2}$/.test(address.region) || !/^\d{5}(-\d{4})?$/.test(address.postalCode)) {
    return Response.json({ error: "A complete US address is required" }, { status: 400 });
  }

  const lock = `confirm-lock:${id}`;
  if (!await put(lock, true, 60, true)) return Response.json({ error: "Confirmation is already being saved. Please retry." }, { status: 409 });
  let saved;
  try {
    const current = await getGift(id);
    if (!current) return Response.json({ error: "Not found" }, { status: 404 });
    if (current.confirmation) return Response.json({ ok: true, alreadyConfirmed: true, confirmation: current.confirmation });
    saved = { ...current, status: "confirmed" as const, confirmation: { chosenProductId, variantId, selected: body.selected, variantTitle: clean(body.variantTitle) || "Default", address, confirmedAt: new Date().toISOString() } };
    await saveGift(saved);
  } finally { await take(lock); }
  await queueConfirmation(saved).catch(() => console.error("[notification] Could not queue; confirmation is saved."));
  console.log(`[api/gifts/${id}/confirm] ${chosenProductId === gift.pick.id ? "kept the pick" : "chose an alternative"} · variant ${variantId} · ${address.city}, ${address.region}`);
  return Response.json({ ok: true, confirmation: saved.confirmation });
}
