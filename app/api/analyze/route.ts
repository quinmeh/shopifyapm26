// Reads the giver's photo with Claude vision and returns 3–5 gift cues (what it saw)
// plus a one-line taste read. The cues drive tappable themed searches on Screen 1c.
// Provider: Claude when ANTHROPIC_API_KEY is set, else Gemini when GEMINI_API_KEY is set.
// Degrades gracefully: with neither it returns no cues and a reason.
import Anthropic from "@anthropic-ai/sdk";
import { photoReader, readPhotoWithGemini } from "@/lib/gemini";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Analysis = z.object({
  read: z.string().describe("One warm sentence about their taste, based only on the photos and what the giver said. No names."),
  cues: z
    .array(
      z.object({
        label: z.string().describe("2–3 lowercase words naming one thing that is visible or that the giver mentioned, e.g. 'tuxedo cat'"),
        query: z.string().describe("3–6 word product search a shopper would type to find a gift for someone who loves this thing"),
      }),
    )
    .min(2)
    .max(5),
});
export type Analysis = z.infer<typeof Analysis>;

const SYSTEM = `You help a gift-giver find themes for a gift. They may share one to three photos about the person they're buying for, a short note about what that person loves (hobbies, favorites, shared memories), or both.
Treat the giver's note as the strongest signal. Turn memories into giftable themes (a trip to Kyoto → matcha set, Kyoto print), never a literal search for the memory.
With several photos, look for what they have in common (a color, a hobby, a mood, a place) and favor cues that more than one photo supports.
List 3 to 5 concrete things, visible in the photos or named by the giver, that could inspire a gift: objects, pets, hobbies, food and drink, places, materials, colors, or a clear aesthetic.
Any everyday photo works: a desk, a meal, a shelf, a screenshot, a messy room. Find the personal details in it (a favorite snack, a plant, a hobby setup, a color they keep choosing).
Skip people and generic structure (walls, windows, floors) unless they reveal a taste, like a city view or a reading nook.
Each cue needs a short label and a product-search query that leads to a gift for a person who loves that thing, not a replacement of the thing itself.
Keep the taste read to one sentence, specific and warm, with no names or guesses about who they are.
Some photos are marked as a photo of the giver and recipient together. For those, use only the setting, the activity and the objects around them (a trail, a kitchen, a concert, a board game).
Never describe, judge or infer anything from people's faces, bodies, clothing, age, ethnicity or other personal characteristics, in any photo.`;

type InPhoto = { contentType?: string; data?: string; people?: boolean };
type Body = { photos?: InPhoto[]; photo?: InPhoto; occasion?: string; about?: string }; // `photo`: single-photo clients
const MAX_ABOUT = 300;
const MAX_PHOTOS = 3;
const MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const photos = (Array.isArray(body.photos) ? body.photos : body.photo ? [body.photo] : [])
    .filter((p): p is Required<Pick<InPhoto, "data">> & InPhoto => typeof p?.data === "string" && p.data.length > 0)
    .slice(0, MAX_PHOTOS)
    .map((p, i) => ({
      mediaType: (MEDIA.has(p.contentType ?? "") ? p.contentType : "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
      data: p.data,
      label: `Photo ${i + 1}${p.people ? " (the giver and recipient together: use only the setting, activity and objects)" : ""}`,
    }));
  // What the giver says they love: private to the search, never shown to the recipient.
  const about = typeof body.about === "string" ? body.about.replace(/\s+/g, " ").trim().slice(0, MAX_ABOUT) : "";
  if (!photos.length && !about) return Response.json({ error: "photo or description required" }, { status: 400 });

  const reader = photoReader();
  if (reader === "off") {
    console.warn("[api/analyze] no ANTHROPIC_API_KEY or GEMINI_API_KEY — skipping photo read");
    return Response.json({ cues: [], read: null, unavailable: "no_key" });
  }

  const occasion = (body.occasion ?? "").trim();
  const started = Date.now();

  if (reader === "gemini") {
    const out = await readPhotoWithGemini(
      { system: SYSTEM, images: photos, occasion, about },
      // Several photos take longer to read (≈11s for three in testing); allow a little more before falling back.
      { apiKey: process.env.GEMINI_API_KEY!, model: process.env.GEMINI_MODEL, budgetMs: photos.length > 1 ? 20000 : 15000 },
    );
    if ("unavailable" in out) return Response.json({ cues: [], read: null, unavailable: out.unavailable });
    console.log(`[api/analyze] gemini ok in ${Date.now() - started}ms (${photos.length} photo${photos.length === 1 ? "" : "s"}${about ? " + note" : ""}) → ${out.cues.map((c) => c.label).join(", ")}`);
    return Response.json(out);
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      output_config: { effort: "low", format: zodOutputFormat(Analysis) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            ...photos.flatMap((p) => [
              { type: "text" as const, text: `${p.label}:` },
              { type: "image" as const, source: { type: "base64" as const, media_type: p.mediaType, data: p.data } },
            ]),
            { type: "text", text: occasion ? `The occasion: ${occasion}.` : "No occasion given." },
            ...(about ? [{ type: "text" as const, text: `What the giver says they love: ${about}` }] : []),
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      console.warn(`[api/analyze] no analysis (stop_reason=${response.stop_reason})`);
      return Response.json({ cues: [], read: null, unavailable: "refused" });
    }
    const out = response.parsed_output;
    console.log(`[api/analyze] claude ok in ${Date.now() - started}ms → ${out.cues.map((c) => c.label).join(", ")}`);
    return Response.json(out);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) {
      console.error("[api/analyze] invalid ANTHROPIC_API_KEY");
      return Response.json({ cues: [], read: null, unavailable: "bad_key" });
    }
    if (e instanceof Anthropic.RateLimitError) {
      console.error("[api/analyze] rate limited");
      return Response.json({ cues: [], read: null, unavailable: "rate_limited" });
    }
    console.error("[api/analyze] failed:", e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : (e as Error).message);
    return Response.json({ cues: [], read: null, unavailable: "error" });
  }
}
