import { redirect } from "next/navigation";
import Link from "next/link";
import { digest, giverBrowserId, giverEmail, ownsGift } from "@/lib/giver-auth";
import { members, removeMember } from "@/lib/private-store";
import { getGift } from "@/lib/store";
import { AppHeader, Card, Screen } from "@/components/ui";
import { GiverEmail } from "@/components/giver-email";
export default async function GiftsPage() {
  const email = await giverEmail(), browserId = await giverBrowserId();
  if (!email && !browserId) redirect("/giver");
  const keys = [...(email ? [`giver-gifts:${digest(email)}`] : []), ...(browserId ? [`browser-gifts:${browserId}`] : [])];
  const gifts = [];
  const ids = new Set((await Promise.all(keys.map(key => members(key)))).flat());
  for (const id of ids) {
    const gift = await getGift(id);
    if (gift && await ownsGift(gift)) gifts.push(gift);
    else if (!gift) for (const key of keys) await removeMember(key, id);
  }
  gifts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Screen><AppHeader right={<Link href="/" className="underline">New gift</Link>} /><main className="flex flex-col gap-3 px-5 pb-5">
    <h1 className="text-[24px] font-bold">My gifts</h1><p className="text-[13px] text-giver-text2">Gifts are saved for 30 days after their latest update.</p>
    {!email && <p className="text-[13px] text-giver-text2">These gifts are private to this browser. Open a gift to add optional email updates and recovery.</p>}
    {!gifts.length && <p>No saved gifts yet.</p>}
    {gifts.map(gift => <Card key={gift.id} className="p-3.5"><a className="block" href={`/gift/${gift.id}`}><h2 className="font-semibold">For {gift.recipientLabel}</h2><p className="text-[14px]">{gift.pick.title}</p><p className="text-[13px] text-giver-text2">{gift.status === "sent" ? "Waiting for their choice" : gift.status === "confirmed" ? "Ready to finish sending" : "Merchant checkout opened"}</p></a></Card>)}
    <GiverEmail />
  </main></Screen>;
}
