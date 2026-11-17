import type { Gift } from "./types";
import { appOrigin, digest } from "./giver-auth";
import { addMember, members, put, read, removeMember } from "./private-store";
import { sendMail, type Mail } from "./email";

type Job = { mail: Mail; createdAt: number; sent?: boolean };
export async function queueConfirmation(gift: Gift) {
  if (!gift.ownerEmail || !gift.confirmation) return;
  const key = `confirmation-${digest(`${gift.id}:${gift.confirmation.confirmedAt}`)}`;
  await put(`notification:${key}`, { createdAt: Date.now(), mail: { to: gift.ownerEmail,
    subject: "They picked their gift — finish the purchase",
    text: `The gift you sent has been confirmed. Your note goes with it.\n\n${gift.deliveryMethod === "give_in_person" ? "You chose to give it in person. Enter your own shipping address at merchant checkout." : "You chose to ship directly to them. Copy their delivery details from the gift page into merchant checkout."}\n\nReview the choice and finish the purchase:\n${appOrigin()}/gift/${gift.id}\n\nUse your verified email to access this private page. Nothing has been charged yet.`,
  } } satisfies Job, 86400 * 30, true);
  await addMember("notifications", key);
  await deliver(key);
}
async function deliver(key: string) {
  const job = await read<Job>(`notification:${key}`);
  if (!job || job.sent) { await removeMember("notifications", key); return; }
  // Provider deduplication lasts 24h; stop automatic retries before that window ends.
  if (Date.now() - job.createdAt > 23 * 3600000) {
    await addMember("notifications-review", key);
    await removeMember("notifications", key);
    return;
  }
  if (!await put(`notification-lock:${key}`, true, 30, true)) return;
  try {
    await sendMail(job.mail, key);
    await put(`notification:${key}`, { ...job, sent: true }, 86400 * 30);
    await removeMember("notifications", key);
  } catch { console.error("[notification] Email pending; scheduled retry required."); }
}
export async function retryNotifications() {
  const keys = (await members("notifications")).slice(0, 20);
  for (const key of keys) await deliver(key);
  return keys.length;
}
