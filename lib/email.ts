import { addMember, members, put, read, removeMember } from "./private-store";
export type Mail = { to: string; subject: string; text: string };
export function previewMail() { return process.env.NODE_ENV === "development" && process.env.EMAIL_MODE === "preview"; }
export function mailConfigured() { return previewMail() || !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM); }
export async function sendMail(mail: Mail, key: string) {
  if (previewMail()) {
    await put(`mail-preview:${key}`, mail, 86400);
    await addMember("mail-preview", key); return;
  }
  if (!mailConfigured()) throw new Error("Email delivery is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, ...mail }), signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
export async function previewInbox() {
  const mail: Mail[] = [];
  for (const key of await members("mail-preview")) {
    const message = await read<Mail>(`mail-preview:${key}`);
    if (message) mail.push(message); else await removeMember("mail-preview", key);
  }
  return mail.reverse();
}
