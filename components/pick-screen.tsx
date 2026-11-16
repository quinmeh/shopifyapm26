"use client";
// Screen 2 · Your pick (`/pick/[productId]`, DESIGN.md §4): pick card, safety net (swap check,
// remove/undo, one-of-a-kind), who it's for, note, create gift → link + Copy.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/catalog";
import type { ProductSnapshot } from "@/lib/types";
import { SwapMiniCard } from "./swap-mini-card";
import {
  BackButton, Card, CheckIcon, CreditFooter, Field, PrimaryButton, Screen, SecondaryButton, Spinner,
  TextLinkButton, inputCls,
} from "./ui";

// Handed over from the search screen (sessionStorage); the product is refetched on a cold load.
export type PickContext = {
  product: ProductSnapshot;
  occasion?: string;
  location?: { label: string; region?: string };
};
export const pickKey = (id: string) => `gc:pick:${id}`;

type SwapState = { status: "loading" | "ready" | "error"; items: ProductSnapshot[]; removed: string[] };

export function PickScreen({ productId }: { productId: string }) {
  const [ctx, setCtx] = useState<PickContext | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [swaps, setSwaps] = useState<SwapState>({ status: "loading", items: [], removed: [] });
  const [recipientLabel, setRecipientLabel] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const swapReq = useRef(0);

  // 1. Context: sessionStorage first, else get_product.
  useEffect(() => {
    let cancelled = false;
    // Deferred so no state is set synchronously inside the effect body.
    queueMicrotask(async () => {
      let stored: PickContext | null = null;
      try {
        const raw = sessionStorage.getItem(pickKey(productId));
        if (raw) stored = JSON.parse(raw) as PickContext;
      } catch { /* fall through to fetch */ }
      if (stored?.product) { if (!cancelled) setCtx(stored); return; }
      try {
        const r = await fetch(`/api/product/${encodeURIComponent(productId)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as { product: ProductSnapshot };
        if (!cancelled) setCtx({ product: j.product });
      } catch {
        if (!cancelled) setLoadError(true);
      }
    });
    return () => { cancelled = true; };
  }, [productId]);

  // 2. Swap check once the pick is known.
  const checkSwaps = useCallback(async (p: ProductSnapshot, region?: string) => {
    const id = ++swapReq.current;
    setSwaps({ status: "loading", items: [], removed: [] });
    try {
      const r = await fetch("/api/swaps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: p.id, priceCents: p.priceCents, sellerName: p.sellerName, region }),
      });
      if (id !== swapReq.current) return;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { swaps: ProductSnapshot[] };
      setSwaps({ status: "ready", items: j.swaps, removed: [] });
    } catch {
      if (id === swapReq.current) setSwaps({ status: "error", items: [], removed: [] });
    }
  }, []);
  useEffect(() => {
    if (!ctx?.product) return;
    const { product, location } = ctx;
    queueMicrotask(() => void checkSwaps(product, location?.region));
  }, [ctx, checkSwaps]);

  const approved = swaps.items.filter((s) => !swaps.removed.includes(s.id));
  const oneOfAKind = swaps.status === "ready" && approved.length === 0;
  const canCreate = !!ctx && swaps.status !== "loading" && note.trim().length > 0 && recipientLabel.trim().length > 0 && !creating;

  const create = async (): Promise<string | null> => {
    if (created) return created.id;
    if (!ctx) return null;
    setCreating(true);
    setCreateError(null);
    try {
      const r = await fetch("/api/gifts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientLabel: recipientLabel.trim(), occasion: ctx.occasion, note: note.trim(), pick: ctx.product, approvedSwaps: approved }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { id: string };
      const url = `${window.location.origin}/g/${j.id}`;
      setCreated({ id: j.id, url });
      return j.id;
    } catch {
      setCreateError("Couldn’t create the gift. Try again.");
      return null;
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try { await navigator.clipboard.writeText(created.url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { /* clipboard blocked: the link is selectable text */ }
  };

  const preview = async () => {
    const id = await create();
    if (id) window.open(`/g/${id}`, "_blank", "noopener");
  };

  // ---------------- render ----------------
  if (loadError) {
    return (
      <Screen theme="giver">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="text-[15px] font-[650]">Couldn’t load this gift.</p>
          <TextLinkButton onClick={() => window.location.reload()}>Try again</TextLinkButton>
        </main>
      </Screen>
    );
  }

  const p = ctx?.product;
  const min = p ? Math.round(p.priceCents * 0.85) : 0;
  const max = p ? Math.round(p.priceCents * 1.15) : 0;
  const shipsTo = ctx?.location?.region ? `Ships to ${ctx.location.label}` : "Ships anywhere in the US";

  return (
    <Screen theme="giver">
      <Header />
      <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
        {/* Pick card */}
        <Card className="flex gap-3 p-3">
          <div className="h-[116px] w-[116px] shrink-0 overflow-hidden rounded-control bg-skeleton">
            {p?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {p ? (
              <>
                <span className="line-clamp-2 text-[15px] font-[650] leading-5">{p.title}</span>
                <span className="truncate text-[13px] text-giver-text2">{p.sellerName ?? "Independent maker"}</span>
                <span className="tabular text-[13px]">
                  {p.rating ? `${p.rating.value} ★ (${p.rating.count}) · ` : ""}{formatCents(p.priceCents)}
                </span>
                <span className="flex items-center gap-1 text-[12px] font-medium text-success-text">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"><CheckIcon size={10} /></span>
                  {shipsTo}
                </span>
              </>
            ) : (
              <>
                <div className="h-4 w-5/6 rounded bg-skeleton" />
                <div className="h-3 w-1/2 rounded bg-skeleton" />
                <div className="h-3 w-1/3 rounded bg-skeleton" />
              </>
            )}
          </div>
        </Card>

        {/* Safety net */}
        <Card className="flex flex-col gap-2.5 p-3.5">
          <div>
            <h2 className="text-[15px] font-[650] leading-5">If it’s not quite them, they can choose one of these</h2>
            <p className="pt-0.5 text-[13px] leading-[18px] text-giver-text2">
              {p ? <>Similar, within {formatCents(min)}–{formatCents(max)}, other makers first. Remove any you wouldn’t give.</> : "Checking for alternatives…"}
            </p>
          </div>
          {swaps.status === "loading" && (
            <div className="flex items-center gap-2 py-3 text-[13px] text-giver-text2"><Spinner label="Checking alternatives" /> Checking the catalog for look-alikes…</div>
          )}
          {swaps.status === "error" && (
            <p className="text-[13px] text-giver-text2">Couldn’t check alternatives. <TextLinkButton onClick={() => p && checkSwaps(p, ctx?.location?.region)}>Try again</TextLinkButton></p>
          )}
          {swaps.status === "ready" && swaps.items.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {swaps.items.map((s) => (
                <SwapMiniCard key={s.id} product={s} removed={swaps.removed.includes(s.id)}
                  onRemove={() => setSwaps((w) => ({ ...w, removed: [...w.removed, s.id] }))}
                  onUndo={() => setSwaps((w) => ({ ...w, removed: w.removed.filter((id) => id !== s.id) }))} />
              ))}
            </div>
          )}
          {oneOfAKind && (
            <p className="rounded-control bg-giver-bg px-3 py-2 text-[13px] leading-[18px]">
              One of a kind. They can confirm details and address, but there’s nothing to swap to.
            </p>
          )}
        </Card>

        {/* Who + note */}
        <Field label="Who’s it for?" htmlFor="who">
          <input id="who" className={inputCls} value={recipientLabel} onChange={(e) => setRecipientLabel(e.target.value)}
            placeholder="your sister, a close friend, your dad…" disabled={!!created} />
        </Field>
        <div className="flex flex-col gap-1">
          <label htmlFor="note" className="text-[14px] font-[650]">What made you think of them?</label>
          <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={!!created} maxLength={500}
            className="w-full rounded-control border border-giver-input bg-surface px-3 py-2 text-[14px] leading-5 text-ink outline-none focus:border-ink"
            placeholder="Your new place deserves a proper view, even on grey days." />
          <p className="text-[12px] text-giver-text2">They read this first. It stays with the gift even if they choose another.</p>
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
        {created ? (
          <Card className="flex flex-col gap-2 p-3">
            <span className="text-[13px] font-[650]">Your gift link</span>
            <div className="flex items-center gap-2">
              <input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} aria-label="Gift link"
                className={`${inputCls} tabular flex-1 text-[13px]`} />
              <SecondaryButton onClick={copy} className="!h-10 !w-auto shrink-0 px-3 text-[13px]">{copied ? "Copied" : "Copy"}</SecondaryButton>
            </div>
            <p className="text-[12px] text-giver-text2">
              Send it however you like — text, email, a sticky note. <a href={`/gift/${created.id}`} className="underline underline-offset-[3px]">Track it here</a>.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <SecondaryButton onClick={() => void preview()} disabled={!canCreate} className="col-span-1 !h-12">Preview</SecondaryButton>
              <PrimaryButton onClick={() => void create()} disabled={!canCreate} className="col-span-2">
                {creating ? "Creating…" : "Create gift link"}
              </PrimaryButton>
            </div>
            <p className="pt-2 text-center text-[12px] text-giver-text2">{createError ?? "Nothing is charged until they confirm."}</p>
          </>
        )}
        <CreditFooter />
      </footer>
    </Screen>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
      <BackButton href="/" />
      <span className="text-[15px] font-[650]">Your pick</span>
    </div>
  );
}
