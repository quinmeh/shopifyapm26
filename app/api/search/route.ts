import { searchCatalog, type SearchArgs } from "@/lib/catalog";
import { cuesFromTitles } from "@/lib/cues";
import { occasionProfile } from "@/lib/occasions";
import { toSnapshot } from "@/lib/snapshot";
import type { ProductSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

// Three modes (BRIEF §3). The occasion leads; the photo adds flavor.
//   occasion — merge the occasion profile's themed text queries (default)
//   photo    — pure visual search on the image; also derives the photo cues
//   cue      — a tapped cue blended with the occasion ("seattle skyline home decor")
type Body = {
  mode?: "occasion" | "photo";
  cue?: string; // cue label
  cueQuery?: string; // the photo read's own search phrase for this cue (Claude/Gemini), if any
  photo?: { contentType: string; data: string }; // base64, ≤1024px JPEG from the client
  occasion?: string;
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

// Interleave several result lists (theme A #1, theme B #1, …) so the grid spans themes.
function interleave(lists: ProductSnapshot[][]): ProductSnapshot[] {
  const out: ProductSnapshot[] = [];
  const seen = new Set<string>();
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const l of lists) {
      const p = l[i];
      if (p && !seen.has(p.id)) { seen.add(p.id); out.push(p); }
    }
  }
  return out;
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

  const occasion = (body.occasion ?? "").trim();
  const profile = occasionProfile(occasion);
  const cue = (body.cue ?? "").trim();
  const hasPhoto = !!body.photo?.data;
  const mode = cue ? "cue" : body.mode === "photo" && hasPhoto ? "photo" : "occasion";

  try {
    if (mode === "occasion") {
      // One call per theme, sequential (the client serializes for the 5 req/s limit).
      const lists: ProductSnapshot[][] = [];
      for (const [i, query] of profile.queries.entries()) {
        const r = await searchCatalog({ query, context: CONTEXT, filters, pagination: { limit: 5 } });
        // The section heading already names the occasion, so the tile shows just the theme.
        const reason = profile.themes[i] ?? query;
        lists.push(r.products.map((p) => ({ ...toSnapshot(p), reason })));
      }
      const products = diversify(interleave(lists), 6);
      const makers = new Set(products.map((p) => p.sellerName).filter(Boolean)).size;
      console.log(`[api/search] occasion(${profile.key}) ← ${products.length} from ${lists.length} themes`);
      return Response.json({ products, makers, mode, occasion: { key: profile.key, read: profile.read } });
    }

    if (mode === "photo") {
      // Verified in M0: any `query` sent alongside an image overrides the visual signal
      // entirely, so this is pure visual. A wider net so the cue extraction finds themes.
      const r = await searchCatalog({
        like: [{ image: { content_type: body.photo!.contentType || "image/jpeg", data: body.photo!.data } }],
        context: CONTEXT, filters, pagination: { limit: 18 },
      });
      const all = r.products.map((p) => ({ ...toSnapshot(p), reason: "Looks like your photo" }));
      const products = diversify(all, 6);
      const makers = new Set(products.map((p) => p.sellerName).filter(Boolean)).size;
      const derived = cuesFromTitles(all.map((p) => ({ title: p.title, seller: p.sellerName })));
      console.log(`[api/search] photo cues ← ${derived.cues.map((c) => c.label).join(", ") || "(none)"}`);
      return Response.json({ products, makers, mode, read: derived.read, cues: derived.cues });
    }

    // cue: blend the photo cue with the occasion's gift vocabulary.
    // Prefer the photo read's specific phrase ("brass candle snuffer wick trimmer");
    // fall back to the label plus the occasion's gift vocabulary ("seattle skyline home decor").
    const phrase = typeof body.cueQuery === "string" ? body.cueQuery.replace(/\s+/g, " ").trim().slice(0, 80) : "";
    const query = phrase || `${cue} ${profile.cueSuffix}`;
    const r = await searchCatalog({ query, context: CONTEXT, filters, pagination: { limit: 8 } });
    const products = diversify(r.products.map((p) => ({ ...toSnapshot(p), reason: `Your photo · ${cue}` })), 6);
    const makers = new Set(products.map((p) => p.sellerName).filter(Boolean)).size;
    console.log(`[api/search] cue "${query}" ← ${products.length}`);
    return Response.json({ products, makers, mode, query });
  } catch (e) {
    console.error("[api/search] failed:", (e as Error).message);
    return Response.json({ error: "Search failed. Try again." }, { status: 502 });
  }
}
