import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { put, read, take } from "./private-store";
import type { Gift } from "./types";

export const digest = (s: string) => createHash("sha256").update(s).digest("hex");
export const sessionCookie = "gc_giver";
export const sessionAge = 60 * 60 * 24 * 30;
export function appOrigin() {
  const url = new URL(process.env.APP_URL || "http://localhost:3000");
  if (process.env.NODE_ENV === "production" && (!process.env.APP_URL || url.protocol !== "https:")) throw new Error("Configure an HTTPS APP_URL.");
  return url.origin;
}
export function safeReturn(value: unknown) {
  return typeof value === "string" && /^\/(gifts|gift\/[A-Za-z0-9_-]+)$/.test(value) ? value : "/gifts";
}
export async function issueLogin(email: string, returnTo: string) {
  const token = randomBytes(32).toString("base64url");
  await put(`login:${digest(token)}`, { email, returnTo: safeReturn(returnTo) }, 900);
  return `${appOrigin()}/auth/verify?token=${token}`;
}
export async function consumeLogin(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const login = await take<{ email: string; returnTo: string }>(`login:${digest(token)}`);
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
  const email = await giverEmail(); return !!email && email === gift.ownerEmail;
}
export function sameOrigin(req: Request) { return req.headers.get("origin") === appOrigin(); }
