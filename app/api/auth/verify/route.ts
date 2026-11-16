import { cookies } from "next/headers";
import { appOrigin, attachVerifiedEmail, consumeLogin, sameOrigin, sessionAge, sessionCookie } from "@/lib/giver-auth";
import { queueConfirmation } from "@/lib/notifications";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Invalid origin", { status: 403 });
  const form = await req.formData();
  const login = await consumeLogin(String(form.get("token") ?? ""));
  if (!login) return Response.redirect(`${appOrigin()}/giver?expired=1`, 303);
  if (login.claim) {
    try {
      const gift = await attachVerifiedEmail(login.email, login.claim);
      // Catch up if the recipient confirmed while verification was pending.
      await queueConfirmation(gift).catch(() => console.error("[notification] Verified gift notification needs retry."));
    } catch {
      return Response.redirect(`${appOrigin()}/giver?claimFailed=1`, 303);
    }
  }
  (await cookies()).set(sessionCookie, login.session, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return Response.redirect(`${appOrigin()}${login.returnTo}`, 303);
}
