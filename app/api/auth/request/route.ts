import { randomUUID } from "node:crypto";
import { digest, issueLogin, sameOrigin, safeReturn } from "@/lib/giver-auth";
import { put } from "@/lib/private-store";
import { mailConfigured, previewMail, sendMail } from "@/lib/email";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Invalid origin" }, { status: 403 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!mailConfigured()) return Response.json({ error: "Email delivery needs to be configured before verification is available." }, { status: 503 });
  if (!await put(`email-limit:${digest(email)}`, true, 60, true)) return Response.json({ error: "Please wait a minute before requesting another link." }, { status: 429 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (!await put(`ip-limit:${digest(ip)}`, true, 10, true)) return Response.json({ error: "Please wait before requesting another link." }, { status: 429 });
  try {
    const link = await issueLogin(email, safeReturn(body.returnTo));
    await sendMail({ to: email, subject: "Verify your email for Gift Confirm", text: `Verify your email and open your private gift tracking page:\n${link}\n\nThis link expires in 15 minutes and can be used once. You’ll receive an email when a recipient confirms your gift. If you didn’t request this, ignore it.` }, `login-${randomUUID()}`);
    return Response.json({ ok: true, preview: previewMail() });
  } catch { return Response.json({ error: "Couldn’t send the verification email. Please try again." }, { status: 503 }); }
}
