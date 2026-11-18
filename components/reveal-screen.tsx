"use client";
// Screen 3 · Reveal (`/g/[id]`, DESIGN.md §4). Gift theme.
// The closed gift floats; "Open your gift" lifts the lid and releases a little confetti before
// moving on. With reduced motion it navigates immediately.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { RecipientGift } from "@/lib/types";
import { GiftHeader, NoteQuote } from "./gift-ui";
import { Confetti, PrimaryButton, Screen, stagger } from "./ui";

export function RevealScreen({ gift }: { gift: RecipientGift }) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const next = `/g/${gift.id}/open`;

  useEffect(() => { router.prefetch(next); }, [router, next]);

  const open = () => {
    if (opening) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { router.push(next); return; }
    setOpening(true);
    setTimeout(() => router.push(next), 900);
  };

  return (
    <Screen theme="gift">
      <GiftHeader />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-6 text-center">
        <AnimatedGift opening={opening} />
        <div>
          <p className="rise text-[14px] font-[550] text-gift-text2" style={stagger(1, 90, 150)}>{gift.giverName} sent you something</p>
          <h1 className="rise font-display pt-1.5 text-[34px] font-semibold leading-[40px] text-gift-text" style={stagger(2, 90, 150)}>{gift.headline}</h1>
        </div>
        <NoteQuote note={gift.note} giverName={gift.giverName} className="rise mt-2" style={stagger(3, 90, 150)} />
      </main>
      <footer className="rise sticky bottom-0 px-5 pb-4 pt-3" style={stagger(4, 90, 150)}>
        <PrimaryButton onClick={open} aria-disabled={opening} aria-live="polite">{opening ? "Opening…" : "Open your gift"}</PrimaryButton>
        <p className="pt-2 text-center text-[12px] text-gift-text2">You’ll confirm a few details. About 30 seconds.</p>
      </footer>
    </Screen>
  );
}

// A wrapped box with a bow, drawn in clay on the clay-tint circle.
function AnimatedGift({ opening }: { opening: boolean }) {
  return (
    <div className="pop relative flex h-[132px] w-[132px] items-center justify-center">
      <span aria-hidden="true" className="ring absolute inset-0 rounded-full bg-clay-tint" />
      <span aria-hidden="true" className="ring absolute inset-0 rounded-full bg-clay-tint" style={{ "--d": "1300ms" } as React.CSSProperties} />
      <span className="absolute inset-0 rounded-full bg-clay-tint" />
      <svg viewBox="0 0 64 64" width="76" height="76" role="img" aria-label={opening ? "Your gift is opening" : "A wrapped gift"}
        className={`relative text-clay ${opening ? "" : "float"}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <g className={opening ? "settle" : ""}>
          <rect x="12" y="30" width="40" height="26" rx="3" fill="var(--color-clay-wash)" />
          <path d="M32 30v26" />
        </g>
        <g className={opening ? "lid-off" : ""}>
          <rect x="9" y="21" width="46" height="10" rx="2.5" fill="var(--color-surface)" />
          <path d="M32 21v10" />
          <path d="M32 21c-3-6-11-9-13-5s5 5 13 5z" fill="var(--color-clay-tint)" />
          <path d="M32 21c3-6 11-9 13-5s-5 5-13 5z" fill="var(--color-clay-tint)" />
        </g>
      </svg>
      {opening && <Confetti pieces={20} spread={130} delay={180} />}
    </div>
  );
}
