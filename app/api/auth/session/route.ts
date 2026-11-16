import { cookies } from "next/headers";
import { digest, giverEmail, sameOrigin, sessionCookie } from "@/lib/giver-auth";
import { take } from "@/lib/private-store";
export async function GET() { return Response.json({ email: await giverEmail() }, { headers: { "Cache-Control": "no-store" } }); }
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return new Response("Invalid origin", { status: 403 });
  const jar = await cookies(); const token = jar.get(sessionCookie)?.value;
  if (token) await take(`session:${digest(token)}`);
  jar.delete(sessionCookie); return Response.json({ ok: true });
}
