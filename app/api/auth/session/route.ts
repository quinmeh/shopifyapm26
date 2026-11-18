import { cookies } from "next/headers";
import { browserCookie, digest, giverEmail, sameOrigin, sessionCookie } from "@/lib/giver-auth";
import { take } from "@/lib/private-store";
export async function GET() { return Response.json({ email: await giverEmail() }, { headers: { "Cache-Control": "no-store" } }); }
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Please reload this page and try again." }, { status: 403 });
  const jar = await cookies(); const token = jar.get(sessionCookie)?.value;
  if (token) await take(`session:${digest(token)}`);
  const browser = jar.get(browserCookie)?.value;
  if (browser) await take(`browser:${digest(browser)}`);
  jar.delete(browserCookie);
  jar.delete(sessionCookie); return Response.json({ ok: true });
}
