// Swap check (BRIEF §3 G2): products similar to the pick, ±15% of its price, shipping to
// the recipient's region. Drops the pick itself, prefers other makers and distinct sellers,
// returns up to 3. Zero results is a valid answer → "one of a kind" in the UI.
import { searchCatalog } from "@/lib/catalog";
import { toSnapshot } from "@/lib/snapshot";
import type { ProductSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = { id: string; priceCents: number; sellerName?: string; region?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.id?.startsWith("gid://shopify/") || !Number.isFinite(body.priceCents) || body.priceCents <= 0) {
    return Response.json({ error: "id and priceCents required" }, { status: 400 });
  }

  try {
    const result = await searchCatalog({
      like: [{ id: body.id }],
      context: { address_country: "US", intent: "buying a gift" },
      filters: {
        ships_to: body.region ? { country: "US", region: body.region } : { country: "US" },
        price: { min: Math.round(body.priceCents * 0.85), max: Math.round(body.priceCents * 1.15) },
      },
      pagination: { limit: 6 },
    });

    const candidates = result.products.filter((p) => p.id !== body.id).map(toSnapshot);
    const swaps = pickDistinct(candidates, body.sellerName, 3);
    console.log(`[api/swaps] ${body.id} → ${swaps.length} swaps: ${swaps.map((s) => `${s.title} (${s.sellerName})`).join(" | ")}`);
    return Response.json({ swaps });
  } catch (e) {
    console.error("[api/swaps] failed:", (e as Error).message);
    return Response.json({ error: "Swap check failed." }, { status: 502 });
  }
}

// Other makers first, one product per seller; fall back to the same maker only if short.
function pickDistinct(items: ProductSnapshot[], pickSeller: string | undefined, n: number): ProductSnapshot[] {
  const out: ProductSnapshot[] = [];
  const seen = new Set<string>();
  for (const pass of [(s?: string) => s !== pickSeller, () => true]) {
    for (const it of items) {
      if (out.length === n) return out;
      const key = it.sellerName ?? it.id;
      if (seen.has(key) || !pass(it.sellerName) || out.includes(it)) continue;
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}
