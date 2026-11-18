import { redirect } from "next/navigation";
import Link from "next/link";
import { ownedGifts } from "@/lib/my-gifts";
import { AppHeader, Screen } from "@/components/ui";
import { GiftListItem } from "@/components/gift-list-item";
import { GiverEmail } from "@/components/giver-email";
export default async function GiftsPage() {
  const { email, browserId, gifts } = await ownedGifts();
  if (!email && !browserId) redirect("/giver");
  return <Screen><AppHeader right={<Link href="/" className="underline">New gift</Link>} /><main className="flex flex-col gap-3 px-5 pb-5">
    <h1 className="font-display text-[28px] font-semibold leading-[34px]">My gifts</h1><p className="text-[13px] text-giver-text2">Gifts are saved for 30 days after their latest update. Delete any you no longer need.</p>
    {!email && <p className="text-[13px] text-giver-text2">These gifts are private to this browser. Open a gift to add optional email updates and recovery.</p>}
    {!gifts.length && <p>No saved gifts yet.</p>}
    <div className="stagger-children flex flex-col gap-2.5">
      {gifts.map(gift => <GiftListItem key={gift.id} id={gift.id} recipientLabel={gift.recipientLabel} title={gift.pick.title} imageUrl={gift.pick.imageUrl} status={gift.status} />)}
    </div>
    <GiverEmail />
  </main></Screen>;
}
