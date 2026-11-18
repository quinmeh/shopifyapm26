// The giver's optional "photo of us", shown to the recipient as a polaroid on the reveal.
// Stored only when the giver ticks "Add this photo to their gift"; kept beside the gift
// (not inside it) so gift reads stay small. Anyone with the gift link can view it, like the note.

export const GIFT_PHOTO_TTL = 60 * 60 * 24 * 45; // outlives the 30-day gift TTL after a late update
export const MAX_PHOTO_BASE64 = 400_000; // ≈300 KB JPEG; the client sends ≤1024px at q0.85
export const giftPhotoKey = (giftId: string) => `gift-photo:${giftId}`;
export type GiftPhoto = { contentType: "image/jpeg"; data: string };

// Accepts only a base64 JPEG of reasonable size; anything else is ignored, never stored.
export function parseGiftPhoto(input: unknown): GiftPhoto | null {
  if (!input || typeof input !== "object") return null;
  const { contentType, data } = input as { contentType?: unknown; data?: unknown };
  if (contentType !== "image/jpeg" || typeof data !== "string") return null;
  if (data.length < 100 || data.length > MAX_PHOTO_BASE64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  const head = Buffer.from(data.slice(0, 8), "base64");
  if (head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) return null; // JPEG magic bytes
  return { contentType: "image/jpeg", data };
}
