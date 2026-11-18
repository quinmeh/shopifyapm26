import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { addMember, put, read, take } from "./private-store";
import { getGift, saveGift } from "./store";
import type { Gift } from "./types";

export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const sessionCookie = "gc_giver";
export const browserCookie = "gc_browser";
export const sessionAge = 60 * 60 * 24 * 30;
export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && (!process.env.APP_URL || url.protocol !== "https:")) throw new Error("Configure an HTTPS APP_URL.");
  return url.origin;
}
export function safeReturn(value: unknown) {
  return typeof value === "string" && /^\/(gifts|gift\/[A-Za-z0-9_-]+)$/.test(value) ? value : "/gifts";
}
export type GiftClaim = { giftId: string; browserId: string };
export async function issueLogin(email: string, returnTo: string, claim?: GiftClaim) {
  const token = randomBytes(32).toString("base64url");
  await put(`login:${digest(token)}`, { email, returnTo: safeReturn(returnTo), claim }, 900);
  return `${appOrigin()}/auth/verify?token=${token}`;
}
export async function consumeLogin(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const login = await take<{ email: string; returnTo: string; claim?: GiftClaim }>(`login:${digest(token)}`);
  if (!login) return null;
  const session = randomBytes(32).toString("base64url");
  await put(`session:${digest(session)}`, login.email, sessionAge);
  return { ...login, session };
}
export async function giverEmail() {
  const token = (await cookies()).get(sessionCookie)?.value;
  return token ? read<string>(`session:${digest(token)}`) : null;
}
export async function ownsGift(gift: Gift) {
  const email = await giverEmail();
  if (email && email === gift.ownerEmail) return true;
  const browserId = await giverBrowserId();
  return !!browserId && browserId === gift.ownerBrowserId;
}
export async function giverBrowserId() {
  const token = (await cookies()).get(browserCookie)?.value;
  if (!token) return null;
  const id = digest(token);
  return await read<boolean>(`browser:${id}`) ? id : null;
}
export async function ensureGiverBrowser() {
  const current = await giverBrowserId();
  if (current) return current;
  const token = randomBytes(32).toString("base64url");
  const id = digest(token);
  await put(`browser:${id}`, true, sessionAge);
  (await cookies()).set(browserCookie, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: sessionAge });
  return id;
}
// The claim is captured only after checking browser ownership, before sending
// the email. Possessing a recipient URL is never enough to claim a gift.
export async function attachVerifiedEmail(email: string, claim: GiftClaim) {
  const lock = `confirm-lock:${claim.giftId}`;
  if (!await put(lock, true, 60, true)) throw new Error("The gift is updating. Request a new verification link shortly.");
  try {
    const gift = await getGift(claim.giftId);
    if (!gift || gift.ownerBrowserId !== claim.browserId || (gift.ownerEmail && gift.ownerEmail !== email)) throw new Error("This gift cannot be linked to that email.");
    const linked = { ...gift, ownerEmail: email };
    await addMember(`giver-gifts:${digest(email)}`, gift.id);
    await saveGift(linked);
    return linked;
  } finally { await take(lock); }
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  if (origin === appOrigin()) return true;
  // Allow alternate loopback URLs only in development and only when the request
  // targets that exact host/port. Production stays pinned to APP_URL.
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const source = new URL(origin);
    const target = new URL(req.url);
    return source.origin === origin && ["http:", "https:"].includes(source.protocol)
      && ["localhost", "127.0.0.1", "[::1]"].includes(source.hostname)
      && source.protocol === target.protocol
      && source.host === (req.headers.get("host") ?? target.host);
  } catch { return false; }
}
