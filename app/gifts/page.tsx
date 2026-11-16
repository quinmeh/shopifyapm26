import { redirect } from "next/navigation";
import Link from "next/link";
import { digest, giverEmail } from "@/lib/giver-auth";
import { members, removeMember } from "@/lib/private-store";
import { getGift } from "@/lib/store";
import { AppHeader, Card, Screen } from "@/components/ui";
import { GiverEmail } from "@/components/giver-email";
export default async function GiftsPage() {
  const email = await giverEmail(); if (!email) redirect("/giver");
  const key = `giver-gifts:${digest(email)}`;
  const gifts = [];
  for (const id of await members(key)) {
    const gift = await getGift(id);
    if (gift?.ownerEmail === email) gifts.push(gift); else await removeMember(key, id);
  }
  gifts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <Screen><AppHeader right={<Link href="/" className="underline">New gift</Link>} /><main className="flex flex-col gap-3 px-5 pb-5">
    <h1 className="text-[24px] font-bold">My gifts</h1><p className="text-[13px] text-giver-text2">Gifts are saved for 30 days after their latest update.</p>
    {!gifts.length && <p>No saved gifts yet. If you just verified, return to your gift creation tab to finish.</p>}
    {gifts.map(gift => <Card key={gift.id} className="p-3.5"><a className="block" href={`/gift/${gift.id}`}><h2 className="font-semibold">For {gift.recipientLabel}</h2><p className="text-[14px]">{gift.pick.title}</p><p className="text-[13px] text-giver-text2">{gift.status === "sent" ? "Waiting for their choice" : gift.status === "confirmed" ? "Ready to finish sending" : "Merchant checkout opened"}</p></a></Card>)}
    <GiverEmail />
  </main></Screen>;
}
