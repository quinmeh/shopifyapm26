"use client";
// Recipient-side primitives (DESIGN.md §3, gift theme): header, NoteQuote, WhyCard, AlsoLikedTag,
// SizePill, OptionRow, BottomSheet. Primary buttons stay ink; clay only for gift moments.
import { useEffect, useRef, type ReactNode } from "react";
import type { RecipientProduct } from "@/lib/types";
import { GiftIcon, XIcon } from "./ui";

export function GiftHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 pt-[18px] pb-3">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-control bg-ink text-white"><GiftIcon size={15} /></span>
        <span className="text-[15px] font-[650]">Gift Confirm</span>
      </div>
      {right ?? <span className="text-[12px] text-gift-text2">No account needed</span>}
    </header>
  );
}

export function GiftCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-gift-border bg-surface ${className}`}>{children}</div>;
}

export function NoteQuote({ note, giverName }: { note: string; giverName: string }) {
  return (
    <figure className="w-full rounded-card border border-gift-border bg-surface px-5 py-[18px]">
      <blockquote className="text-[16px] leading-[25px] text-gift-text">“{note}”</blockquote>
      <figcaption className="pt-2 text-[13px] font-[550] text-clay">— {giverName}</figcaption>
    </figure>
  );
}

export function WhyCard({ note, giverName }: { note: string; giverName: string }) {
  return (
    <div className="rounded-control bg-clay-wash p-3">
      <p className="text-[12px] font-[650] text-clay">Why {giverName} picked this</p>
      <p className="pt-1 text-[13px] leading-[19px] text-gift-text">{note}</p>
    </div>
  );
}

export function AlsoLikedTag({ giverName }: { giverName: string }) {
  return <span className="absolute left-2 top-2 rounded-full bg-clay-tint px-2.5 py-1 text-[12px] font-semibold text-clay">{giverName} also liked</span>;
}

export function SizePill({ label, selected, soldOut, onClick }: { label: string; selected: boolean; soldOut: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={soldOut} aria-pressed={selected}
      className={`h-11 min-w-16 rounded-control px-3 text-[14px] font-medium ${
        soldOut ? "border border-dashed border-gift-input bg-soldout-bg text-soldout-text line-through"
        : selected ? "bg-ink text-white"
        : "border border-gift-input bg-surface text-gift-text"}`}>
      {label}
    </button>
  );
}

export function OptionRow({ product, current, label, onClick }: {
  product: RecipientProduct; current: boolean; label: string | null; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} aria-pressed={current}
      className={`flex w-full items-center gap-3 rounded-card bg-surface p-2.5 text-left ${current ? "border-2 border-ink" : "border border-gift-border"}`}>
      <span className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-control bg-skeleton">
        {product.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
          <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-[14px] font-semibold leading-[18px] text-gift-text">{product.title}</span>
        <span className="block truncate text-[12px] text-gift-text2">{product.sellerName ?? "Independent maker"}</span>
      </span>
      {label && <span className="shrink-0 text-[12px] font-semibold text-clay">{label}</span>}
    </button>
  );
}

// Bottom sheet: blurred backdrop, slide ≤200ms, role=dialog, focus trapped, Esc/backdrop close,
// focus returns to the opener (DESIGN §6).
export function BottomSheet({ open, title, subtitle, onClose, children }: {
  open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => closeRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key !== "Tab" || !sheetRef.current) return;
      const focusables = sheetRef.current.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); opener?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay backdrop-blur-[8px]" onClick={onClose}>
      <div ref={sheetRef} role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={(e) => e.stopPropagation()}
        className="sheet-up flex max-h-[85dvh] w-full max-w-[480px] flex-col rounded-t-sheet bg-surface px-5 pb-6 pt-2">
        <span className="mx-auto mb-3 h-[5px] w-10 rounded-full bg-gift-input" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="sheet-title" className="text-[18px] font-bold leading-6 text-gift-text">{title}</h2>
            {subtitle && <p className="pt-0.5 text-[13px] leading-[18px] text-gift-text2">{subtitle}</p>}
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gift-border bg-surface text-gift-text">
            <XIcon size={14} />
          </button>
        </div>
        <div className="mt-3 flex min-h-0 flex-col gap-2 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
