import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { previewInbox, previewMail } from "@/lib/email";
export const dynamic = "force-dynamic";
export default async function LocalMail() {
  const host = (await headers()).get("host") ?? "";
  if (!previewMail() || !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) notFound();
  const messages = await previewInbox();
  return <main className="mx-auto max-w-[480px] space-y-4 p-5"><h1 className="text-2xl font-bold">Local email preview</h1><p>No emails are sent. Development only. Refresh to see new messages.</p>
    {messages.map((mail, i) => <article key={i} className="rounded-card border border-giver-border bg-white p-4"><h2 className="font-semibold">{mail.subject}</h2><p>{mail.to}</p><p className="whitespace-pre-wrap break-all">{mail.text}</p>
      {mail.text.match(/https?:\/\/[^\s]+/g)?.map(url => <a key={url} href={url} className="block py-2 underline">Open link</a>)}
    </article>)}
  </main>;
}
