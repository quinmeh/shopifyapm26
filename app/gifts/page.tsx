import { redirect } from "next/navigation";
import Link from "next/link";
import { ownedGifts } from "@/lib/my-gifts";
import { AppHeader, Card, Screen } from "@/components/ui";
import { GiverEmail } from "@/components/giver-email";
export default async function GiftsPage() {
  const { email, browserId, gifts } = await ownedGifts();
  if (!email && !browserId) redirect("/giver");
  return <Screen><AppHeader right={<Link href="/" className="underline">New gift</Link>} /><main className="flex flex-col gap-3 px-5 pb-5">
    <h1 className="font-display text-[28px] font-semibold leading-[34px]">My gifts</h1><p className="text-[13px] text-giver-text2">Gifts are saved for 30 days after their latest update.</p>
    {!email && <p className="text-[13px] text-giver-text2">These gifts are private to this browser. Open a gift to add optional email updates and recovery.</p>}
    {!gifts.length && <p>No saved gifts yet.</p>}
    <div className="stagger-children flex flex-col gap-2.5">
      {gifts.map(gift => <Card key={gift.id} className="press p-3 hover:border-giver-input"><a className="flex items-center gap-3" href={`/gift/${gift.id}`}>
        <span className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-skeleton">
          {gift.pick.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
            <img src={gift.pick.imageUrl} alt="" className="img-reveal h-full w-full object-cover" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">For {gift.recipientLabel}</span>
          <span className="block truncate text-[13px]">{gift.pick.title}</span>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${gift.status === "sent" || gift.status === "cancelled" ? "bg-giver-bg text-giver-text2" : "bg-success-tint text-success-text"}`}>{gift.status === "sent" ? "Waiting for their choice" : gift.status === "confirmed" ? "Ready to finish sending" : gift.status === "cancelled" ? "Cancelled" : "Merchant checkout opened"}</span>
        </span>
      </a></Card>)}
    </div>
    <GiverEmail />
  </main></Screen>;
}
