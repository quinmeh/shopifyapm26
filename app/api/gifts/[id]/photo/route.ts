// The giver's "photo of us" for the recipient's polaroid. Same access as the gift link.
import { giftPhotoKey, type GiftPhoto } from "@/lib/gift-photo";
import { read } from "@/lib/private-store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/gifts/[id]/photo">) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const photo = await read<GiftPhoto>(giftPhotoKey(id));
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
