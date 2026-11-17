import { censusMatches } from "@/lib/address";
import { sameOrigin } from "@/lib/giver-auth";
import { getGift } from "@/lib/store";
import { put } from "@/lib/private-store";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Please search from the gift page." }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (query.length < 8 || query.length > 300 || typeof body?.giftId !== "string" || body.giftId.length > 100) return Response.json({ error: "Enter a street address with a city and state, or ZIP." }, { status: 400 });
  // Recipient possession of a valid gift link is sufficient; no sign-in needed.
  if (!await getGift(body.giftId)) return Response.json({ error: "Gift not found" }, { status: 404 });
  if (!await put(`address-search:${body.giftId}`, true, 1, true)) return Response.json({ error: "Please wait a moment before searching again." }, { status: 429 });
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.search = new URLSearchParams({ address: query, benchmark: "Public_AR_Current", format: "json" }).toString();
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error("Lookup unavailable");
    return Response.json({ matches: censusMatches(await response.json()) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    // Do not log the query or provider response: both contain a personal address.
    return Response.json({ error: "Address search is unavailable. You can enter the address below." }, { status: 502 });
  }
}
