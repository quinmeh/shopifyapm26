"use client";
// Screen 5 · All set (`/g/[id]/done`, DESIGN.md §4). Gift theme.
import { possessive } from "@/lib/recipient";
import type { RecipientGift } from "@/lib/types";
import { GiftCard, GiftHeader } from "./gift-ui";
import { BowMark, Confetti, DrawnCheck, Screen, stagger } from "./ui";

export function DoneScreen({ gift }: { gift: RecipientGift }) {
  const c = gift.confirmation!;
  const inPerson = gift.deliveryMethod === "give_in_person";
  const address = c.address;
  const chosen = [gift.pick, ...gift.approvedSwaps].find((p) => p.id === c.chosenProductId) ?? gift.pick;
  return (
    <Screen theme="gift">
      <GiftHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-6 text-center">
        <span className="relative flex h-[96px] w-[96px] items-center justify-center">
          <span className="pop absolute inset-0 rounded-full bg-success-tint" />
          <span className="relative text-success"><DrawnCheck size={44} delay={260} strokeWidth={2.6} /></span>
          <Confetti pieces={22} spread={160} delay={320} />
        </span>
        <div className="rise" style={stagger(1, 90, 250)}>
          <h1 className="font-display text-[34px] font-semibold leading-[40px] text-gift-text">You’re all set</h1>
          <p className="pt-2 text-[14px] leading-5 text-gift-text2">{inPerson ? `Your choice is saved. ${gift.giverName} will take it from here.` : `Your choice and delivery details are saved. ${gift.giverName} can now finish the purchase.`}</p>
        </div>
        <div className="rise w-full" style={stagger(2, 90, 250)}>
        <GiftCard className="flex w-full items-center gap-3 p-3 text-left">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-skeleton">
            {chosen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={chosen.imageUrl} alt="" className="img-reveal h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-gift-text">{chosen.title}{c.variantTitle && c.variantTitle !== "Default" && c.variantTitle !== chosen.title ? ` · ${c.variantTitle}` : ""}</span>
            <span className="block truncate text-[12px] text-gift-text2">{chosen.sellerName ?? "Independent maker"}</span>
            {inPerson ? <span className="block text-[12px] text-gift-text2">{gift.giverName} will give this to you in person.</span> : address && <>
              {address.fullName && <span className="block text-[12px] text-gift-text2">For {address.fullName}</span>}
              <span className="block text-[12px] text-gift-text2">To {address.line1}{address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.region} {address.postalCode}</span>
            </>}
          </span>
        </GiftCard>
        </div>
        <span className="rise flex items-center gap-1.5 rounded-full bg-clay-tint px-3 py-1.5 text-[12px] font-semibold text-clay" style={stagger(3, 90, 250)}><BowMark size={14} />{possessive(gift.giverName)} note travels with your gift</span>
      </main>
      <footer className="fade-in px-5 pb-6 text-center text-[12px] text-gift-text2" style={stagger(5, 90, 250)}>You can close this page.</footer>
    </Screen>
  );
}
