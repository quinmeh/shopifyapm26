import { searchCatalog, type SearchArgs } from "@/lib/catalog";
import { cuesFromTitles } from "@/lib/cues";
import { toSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

type Body = {
  photo?: { contentType: string; data: string }; // base64, ≤1024px JPEG from the client
  occasion?: string;
  cue?: string; // a cue's search query from /api/analyze (tapped chip)
  budget?: { min: number; max: number }; // cents
  region?: string; // "WA" or omitted for anywhere in the US
};

const CONTEXT = { address_country: "US", intent: "buying a gift" };

// Keep catalog order but let no single seller take more than two of the first `n` tiles
// while other makers are available (BRIEF §5: prefer distinct sellers).
function diversify<T extends { sellerName?: string }>(items: T[], n: number): T[] {
  const out: T[] = [];
  const perSeller = new Map<string, number>();
  const skipped: T[] = [];
  for (const it of items) {
    const key = it.sellerName ?? "";
    if ((perSeller.get(key) ?? 0) >= 2) { skipped.push(it); continue; }
    perSeller.set(key, (perSeller.get(key) ?? 0) + 1);
    out.push(it);
    if (out.length === n) return out;
  }
  return [...out, ...skipped].slice(0, n);
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const min = Number(body.budget?.min ?? 2500);
  const max = Number(body.budget?.max ?? 6000);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max <= min) {
    return Response.json({ error: "Invalid budget" }, { status: 400 });
  }

  // Verified Nov 2026: no rating filter. It starves both visual and text search — few on-theme
  // products carry ≥5 reviews, so results fall through to unrelated rated items (eSIMs for a
  // skyline photo; punch-needle kits for "space needle"). Ratings are shown on tiles instead.
  const filters: SearchArgs["filters"] = {
    ships_to: body.region ? { country: "US", region: body.region } : { country: "US" },
    price: { min, max },
  };

  // Verified in M0: any `query` sent alongside an image overrides the visual
  // signal entirely, so a photo search is pure visual. Text is the fallback.
  const occasion = (body.occasion ?? "").trim();
  const context = {
    ...CONTEXT,
    ...(occasion ? { intent: `buying a gift for ${occasion}` } : {}),
  };
  // A cue (from /api/analyze) is a themed text search; it replaces the photo for that request.
  const cue = (body.cue ?? "").trim();
  const args: SearchArgs = cue
    ? { query: cue }
    : body.photo?.data
      ? { like: [{ image: { content_type: body.photo.contentType || "image/jpeg", data: body.photo.data } }] }
      : { query: occasion ? `housewarming gift — ${occasion}` : "housewarming gift" };

  const mode = cue ? "cue" : body.photo?.data ? "photo" : "text";
  // Photo mode fetches a wider net so the cue extraction has enough titles to find themes.
  const limit = mode === "photo" ? 18 : 6;

  try {
    const result = await searchCatalog({ ...args, context, filters, pagination: { limit } });
    const all = result.products.map(toSnapshot);
    const products = diversify(all, 6);
    const makers = new Set(products.map((p) => p.sellerName).filter(Boolean)).size;
    const derived = mode === "photo" ? cuesFromTitles(all.map((p) => ({ title: p.title, seller: p.sellerName }))) : null;
    if (derived) console.log(`[api/search] catalog cues ← ${derived.cues.map((c) => c.label).join(", ") || "(none)"}`);
    return Response.json({ products, makers, mode, ...(derived ? { read: derived.read, cues: derived.cues } : {}) });
  } catch (e) {
    console.error("[api/search] failed:", (e as Error).message);
    return Response.json({ error: "Search failed. Try again." }, { status: 502 });
  }
}
