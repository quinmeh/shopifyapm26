import { cookies } from "next/headers";
import { appOrigin, consumeLogin, sameOrigin, sessionAge, sessionCookie } from "@/lib/giver-auth";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Invalid origin", { status: 403 });
  const form = await req.formData();
  const login = await consumeLogin(String(form.get("token") ?? ""));
  if (!login) return Response.redirect(`${appOrigin()}/giver?expired=1`, 303);
  (await cookies()).set(sessionCookie, login.session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return Response.redirect(`${appOrigin()}${login.returnTo}`, 303);
}
