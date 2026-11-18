// Photo read with Google Gemini (REST, no SDK). Used when GEMINI_API_KEY is set and
// ANTHROPIC_API_KEY is not. Returns the same shape as the Claude read in /api/analyze.
// Docs: https://ai.google.dev/api/generate-content
import { z } from "zod";

export const PhotoRead = z.object({
  read: z.string().min(1),
  cues: z.array(z.object({ label: z.string().min(1), query: z.string().min(1) })).min(1).max(5),
});
export type PhotoRead = z.infer<typeof PhotoRead>;
export type PhotoReadFailure = { unavailable: "bad_key" | "rate_limited" | "refused" | "error" };

// Override with GEMINI_MODEL if Google renames or retires this one.
export const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"; // 2.5-flash is closed to new keys (Nov 2026)

// OpenAPI-subset schema Gemini uses for structured JSON output.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    read: { type: "STRING", description: "One warm sentence about their taste, based only on what is visible. No names." },
    cues: {
      type: "ARRAY",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING", description: "2–3 lowercase words naming one visible thing, e.g. 'tuxedo cat'" },
          query: { type: "STRING", description: "3–6 word product search a shopper would type to find a gift for someone who loves this thing" },
        },
        required: ["label", "query"],
      },
    },
  },
  required: ["read", "cues"],
};

export async function readPhotoWithGemini(
  input: { system: string; images: { mediaType: string; data: string; label: string }[]; occasion: string },
  opts: { apiKey: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number; retryDelaysMs?: number[]; budgetMs?: number },
): Promise<PhotoRead | PhotoReadFailure> {
  const model = opts.model || DEFAULT_GEMINI_MODEL;
  const doFetch = opts.fetchImpl ?? fetch;
  const retryDelays = opts.retryDelaysMs ?? [700, 1600]; // 503/500 "high demand" spikes are usually brief
  // Whole read, retries included, must finish within this budget; the giver is waiting on it.
  const deadline = Date.now() + (opts.budgetMs ?? 15000);
  let res!: Response;
  for (let attempt = 0; ; attempt++) {
  try {
    res = await doFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": opts.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{
          role: "user",
          parts: [
            ...input.images.flatMap((img) => [{ text: `${img.label}:` }, { inline_data: { mime_type: img.mediaType, data: img.data } }]),
            { text: input.occasion ? `The occasion: ${input.occasion}.` : "No occasion given." },
          ],
        }],
        generationConfig: { responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(Math.max(1000, Math.min(opts.timeoutMs ?? 12000, deadline - Date.now()))),
    });
  } catch (e) {
    console.error("[gemini] request failed:", (e as Error).message);
    return { unavailable: "error" };
  }
  if ((res.status === 503 || res.status === 500) && attempt < retryDelays.length && deadline - Date.now() > retryDelays[attempt] + 3000) {
    console.warn(`[gemini] HTTP ${res.status} (${model}), retry ${attempt + 1} in ${retryDelays[attempt]}ms`);
    await new Promise((r) => setTimeout(r, retryDelays[attempt]));
    continue;
  }
  break;
  }

  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 300);
    console.error(`[gemini] HTTP ${res.status} (${model}): ${detail}`);
    if (res.status === 429) return { unavailable: "rate_limited" };
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID|API key not valid/i.test(detail)) return { unavailable: "bad_key" };
    return { unavailable: "error" };
  }

  const body = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  if (body?.promptFeedback?.blockReason) {
    console.warn(`[gemini] blocked: ${body.promptFeedback.blockReason}`);
    return { unavailable: "refused" };
  }
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let json: unknown;
  try { json = JSON.parse(text); } catch {
    console.warn(`[gemini] no JSON (finishReason=${body?.candidates?.[0]?.finishReason ?? "?"})`);
    return { unavailable: "refused" };
  }
  // Be forgiving about count; strict about shape.
  if (json && typeof json === "object" && Array.isArray((json as { cues?: unknown[] }).cues)) {
    (json as { cues: unknown[] }).cues = (json as { cues: unknown[] }).cues.slice(0, 5);
  }
  const parsed = PhotoRead.safeParse(json);
  if (!parsed.success) {
    console.warn("[gemini] response did not match the schema");
    return { unavailable: "refused" };
  }
  return { read: parsed.data.read, cues: parsed.data.cues.map((c) => ({ label: c.label.toLowerCase().trim(), query: c.query.trim() })) };
}

export function photoReader(): "claude" | "gemini" | "off" {
  if (process.env.ANTHROPIC_API_KEY) return "claude";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "off";
}
