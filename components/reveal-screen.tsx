"use client";
// Screen 3 · Reveal (`/g/[id]`, DESIGN.md §4). Gift theme.
import type { RecipientGift } from "@/lib/types";
import { GiftHeader, NoteQuote } from "./gift-ui";
import { GiftIcon, PrimaryButton, Screen } from "./ui";

export function RevealScreen({ gift }: { gift: RecipientGift }) {
  return (
    <Screen theme="gift">
      <GiftHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-5 px-5 pb-6 text-center">
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-clay-tint text-clay"><GiftIcon size={44} /></span>
        <div>
          <p className="text-[14px] font-[550] text-gift-text2">{gift.giverName} sent you something</p>
          <h1 className="pt-1 text-[30px] font-bold leading-9 tracking-[-0.4px] text-gift-text">{gift.headline}</h1>
        </div>
        <NoteQuote note={gift.note} giverName={gift.giverName} />
      </main>
      <footer className="sticky bottom-0 px-5 pb-4 pt-3">
        <PrimaryButton href={`/g/${gift.id}/open`}>Open your gift</PrimaryButton>
        <p className="pt-2 text-center text-[12px] text-gift-text2">You’ll confirm a few details. About 30 seconds.</p>
      </footer>
    </Screen>
  );
}
