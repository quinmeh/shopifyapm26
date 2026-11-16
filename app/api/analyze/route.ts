// Reads the giver's photo with Claude vision and returns 3–5 gift cues (what it saw)
// plus a one-line taste read. The cues drive tappable themed searches on Screen 1c.
// Degrades gracefully: without ANTHROPIC_API_KEY it returns no cues and a reason.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

export const dynamic = "force-dynamic";

const Analysis = z.object({
  read: z.string().describe("One warm sentence about her taste, based only on what is visible. No names."),
  cues: z
    .array(
      z.object({
        label: z.string().describe("2–3 lowercase words naming one visible thing, e.g. 'tuxedo cat'"),
        query: z.string().describe("3–6 word product search a shopper would type to find a gift for someone who loves this thing"),
      }),
    )
    .min(2)
    .max(5),
});
export type Analysis = z.infer<typeof Analysis>;

const SYSTEM = `You help a gift-giver who uploaded a photo of something the recipient loves.
List 3 to 5 concrete things visible in the photo that could inspire a gift: objects, pets, hobbies, materials, or a clear aesthetic.
Skip people and generic structure (walls, windows, floors) unless they reveal a taste, like a city view or a reading nook.
Each cue needs a short label and a product-search query that leads to a gift for a person who loves that thing, not a replacement of the thing itself.
Keep the taste read to one sentence, specific and warm, with no names or guesses about who she is.`;

type Body = { photo?: { contentType: string; data: string }; occasion?: string };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.photo?.data) return Response.json({ error: "photo required" }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[api/analyze] ANTHROPIC_API_KEY not set — skipping photo read");
    return Response.json({ cues: [], read: null, unavailable: "no_key" });
  }

  const mediaType = (body.photo.contentType || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  const occasion = (body.occasion ?? "").trim();
  const started = Date.now();

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
            { type: "image", source: { type: "base64", media_type: mediaType, data: body.photo.data } },
            { type: "text", text: occasion ? `The occasion: ${occasion}.` : "No occasion given." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      console.warn(`[api/analyze] no analysis (stop_reason=${response.stop_reason})`);
      return Response.json({ cues: [], read: null, unavailable: "refused" });
    }
    const out = response.parsed_output;
    console.log(`[api/analyze] ok in ${Date.now() - started}ms → ${out.cues.map((c) => c.label).join(", ")}`);
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
