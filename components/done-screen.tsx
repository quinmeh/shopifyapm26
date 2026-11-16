"use client";
// Screen 5 · All set (`/g/[id]/done`, DESIGN.md §4). Gift theme.
import { possessive } from "@/lib/recipient";
import type { RecipientGift } from "@/lib/types";
import { GiftCard, GiftHeader } from "./gift-ui";
import { CheckIcon, Screen } from "./ui";

export function DoneScreen({ gift }: { gift: RecipientGift }) {
  const c = gift.confirmation!;
  const chosen = [gift.pick, ...gift.approvedSwaps].find((p) => p.id === c.chosenProductId) ?? gift.pick;
  return (
    <Screen theme="gift">
      <GiftHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-6 text-center">
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-success-tint text-success"><CheckIcon size={40} /></span>
        <div>
          <h1 className="text-[30px] font-bold leading-9 tracking-[-0.4px] text-gift-text">You’re all set</h1>
          <p className="pt-2 text-[14px] leading-5 text-gift-text2">{gift.giverName} will be notified to finish sending it. Your choice is saved.</p>
        </div>
        <GiftCard className="flex w-full items-center gap-3 p-3 text-left">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-skeleton">
            {chosen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={chosen.imageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-gift-text">{chosen.title}{c.variantTitle && c.variantTitle !== "Default" ? ` · ${c.variantTitle}` : ""}</span>
            <span className="block truncate text-[12px] text-gift-text2">{chosen.sellerName ?? "Independent maker"}</span>
            <span className="block truncate text-[12px] text-gift-text2">To {c.address.line1}, {c.address.city}</span>
          </span>
        </GiftCard>
        <span className="rounded-full bg-clay-tint px-3 py-1.5 text-[12px] font-semibold text-clay">{possessive(gift.giverName)} note travels with your gift</span>
      </main>
      <footer className="px-5 pb-6 text-center text-[12px] text-gift-text2">You can close this page.</footer>
    </Screen>
  );
}
