"use client";
// Screen 2 · Your pick (`/pick/[productId]`, DESIGN.md §4): pick card, safety net (swap check,
// remove/undo, one-of-a-kind), who it's for, note, create gift → link + Copy.
import { useCallback, useEffect, useRef, useState } from "react";
import { formatCents } from "@/lib/catalog";
import type { DeliveryMethod, ProductSnapshot } from "@/lib/types";
import { SwapMiniCard } from "./swap-mini-card";
import { GiverEmail } from "./giver-email";
import { Polaroid } from "./gift-ui";
import { MyGiftsLink } from "./my-gifts-link";
import {
  BackButton, BowMark, Card, CheckIcon, Confetti, CreditFooter, InstagramIcon, MailIcon, MessageIcon, PrimaryButton, Screen, SecondaryButton, ShareIcon, Spinner,
  TextLinkButton, inputCls, stagger,
} from "./ui";

// Handed over from the search screen (sessionStorage); the product is refetched on a cold load.
export type PickContext = {
  product: ProductSnapshot;
  // How the giver found it, for quality logging: which view, grid position, and how many
  // times they changed chips/filters/photo before picking.
  source?: { view: string; position: number; of: number; refinements: number };
  occasion?: string;
  location?: { label: string; region?: string };
  about?: string; // the giver's private "what do they love" line; only offered as a note starting point
  photos?: { contentType: string; data: string; people?: boolean }[]; // the giver's uploads; one may go on the note
};
export const pickKey = (id: string) => `gc:pick:${id}`;

// Polaroids are small: re-encode to ≤720px so even busy phone photos stay well under the
// server limit (a full-size 1024px upload could exceed it and be dropped).
async function toPolaroidJpeg(base64: string): Promise<{ contentType: "image/jpeg"; data: string }> {
  const img = new Image();
  img.src = `data:image/jpeg;base64,${base64}`;
  await img.decode();
  const scale = Math.min(1, 720 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { contentType: "image/jpeg", data: canvas.toDataURL("image/jpeg", 0.8).split(",")[1] };
}
// One label style for every question on this screen so the form reads as one column.
const sectionLabel = "text-[15px] font-[650] leading-5 text-ink";
const EMAIL_KEY = "twofold:giver-email"; // per-browser convenience only
const validEmail = (v: string) => v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type SwapState = { status: "loading" | "ready" | "error"; items: ProductSnapshot[]; removed: string[] };

export function PickScreen({ productId }: { productId: string }) {
  const [ctx, setCtx] = useState<PickContext | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [swaps, setSwaps] = useState<SwapState>({ status: "loading", items: [], removed: [] });
  const [recipientLabel, setRecipientLabel] = useState("");
  const [note, setNote] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("ship_to_recipient");
  // Which uploaded photo goes on the note as a polaroid (null = none). Set once the context loads:
  // a "Photo of us" is preselected; otherwise nothing is.
  const [photoChoice, setPhotoChoice] = useState<number | null | undefined>(undefined);
  const notePhotos = ctx?.photos ?? [];
  const chosenPhoto = photoChoice === undefined ? (() => { const i = notePhotos.findIndex((p) => p.people); return i >= 0 ? i : null; })() : photoChoice;
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  // Confirmation email: on by default. A verified browser needs nothing; otherwise the giver
  // types an email and creating the link sends the one-tap verification link.
  const [notify, setNotify] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const swapReq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(async () => {
      try { const saved = localStorage.getItem(EMAIL_KEY); if (saved && !cancelled) setNotifyEmail(saved); } catch { /* storage blocked */ }
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        const j = r.ok ? ((await r.json()) as { email: string | null }) : { email: null };
        if (!cancelled) setSessionEmail(j.email);
      } catch { if (!cancelled) setSessionEmail(null); }
    });
    return () => { cancelled = true; };
  }, []);

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
  const emailReady = !notify || !!sessionEmail || validEmail(notifyEmail.trim());
  const canCreate = !!ctx && swaps.status !== "loading" && note.trim().length > 0 && recipientLabel.trim().length > 0 && emailReady && !creating;

  const create = async (): Promise<string | null> => {
    if (created) return created.id;
    if (!ctx) return null;
    setCreating(true);
    setCreateError(null);
    try {
      const r = await fetch("/api/gifts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientLabel: recipientLabel.trim(), occasion: ctx.occasion, note: note.trim(), pick: { ...ctx.product, reason: undefined }, approvedSwaps: approved, deliveryMethod, notify, source: ctx.source, photo: chosenPhoto !== null && notePhotos[chosenPhoto] ? await toPolaroidJpeg(notePhotos[chosenPhoto].data) : undefined }),
      });
      if (!r.ok) throw new Error((await r.json()).error ?? "Couldn’t create the gift.");
      const j = (await r.json()) as { id: string };
      const url = `${window.location.origin}/g/${j.id}`;
      if (notify && !sessionEmail) await requestNotify(j.id, notifyEmail.trim());
      setCreated({ id: j.id, url });
      return j.id;
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Couldn’t create the gift. Try again.");
      return null;
    } finally {
      setCreating(false);
    }
  };

  // Sends the verification link for this gift. The link itself never blocks sharing.
  const requestNotify = async (giftId: string, email: string) => {
    try { localStorage.setItem(EMAIL_KEY, email); } catch { /* storage blocked */ }
    try {
      const r = await fetch("/api/auth/request", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, giftId, returnTo: `/gift/${giftId}` }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setSentTo(email);
    } catch (e) {
      setNotifyError(e instanceof Error && e.message ? e.message : "Couldn’t send the verification email.");
    }
  };

  const copy = async (): Promise<boolean> => {
    if (!created) return false;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      setShareNotice(null);
      setTimeout(() => setCopied(false), 1800);
      return true;
    } catch {
      // Clipboard blocked: the link remains selectable in the read-only input.
      return false;
    }
  };

  const shareText = created ? `I picked something for you. Open your gift: ${created.url}` : "";

  const sendVia = async (channel: "text" | "gmail" | "instagram" | "more") => {
    if (!created) return;
    if (channel === "more") {
      if (navigator.share) {
        try {
          await navigator.share({ title: "A gift for you", text: "I picked something for you.", url: created.url });
          return;
        } catch (error) {
          if ((error as DOMException).name === "AbortError") return;
        }
      }
      await copy();
      setShareNotice("Link copied — paste it wherever you like.");
      return;
    }

    if (channel === "instagram") {
      const popup = window.open("https://www.instagram.com/direct/inbox/", "_blank", "noopener,noreferrer");
      const copiedLink = await copy();
      if (!popup) window.location.href = "https://www.instagram.com/direct/inbox/";
      setShareNotice(copiedLink ? "Link copied — paste it into your Instagram message." : "Copy the link above, then paste it into Instagram.");
      return;
    }

    if (channel === "text") {
      window.location.href = `sms:?&body=${encodeURIComponent(shareText)}`;
      return;
    }

    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent("A gift for you")}&body=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
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
      {!created && <main className="stagger-children flex flex-1 flex-col gap-2.5 px-5 pb-4">
        {/* Pick card */}
        <Card className="flex gap-3 p-3">
          <div className="h-[116px] w-[116px] shrink-0 overflow-hidden rounded-control bg-skeleton">
            {p?.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={p.imageUrl} alt="" className="img-reveal h-full w-full object-cover" />
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
                <div className="shimmer h-4 w-5/6 rounded" />
                <div className="shimmer h-3 w-1/2 rounded" />
                <div className="shimmer h-3 w-1/3 rounded" />
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
            <div className="stagger-children grid grid-cols-3 gap-2">
              {swaps.items.map((s) => (
                <SwapMiniCard key={s.id} product={s} removed={swaps.removed.includes(s.id)}
                  onRemove={() => setSwaps((w) => ({ ...w, removed: [...w.removed, s.id] }))}
                  onUndo={() => setSwaps((w) => ({ ...w, removed: w.removed.filter((id) => id !== s.id) }))} />
              ))}
            </div>
          )}
          {oneOfAKind && (
            <p className="rounded-control bg-giver-bg px-3 py-2 text-[13px] leading-[18px]">
              One of a kind. They can confirm their gift details, but there’s nothing to swap to.
            </p>
          )}
        </Card>

        {/* Who + note */}
        <div className="flex flex-col gap-1.5 pt-1">
          <label htmlFor="who" className={sectionLabel}>Who’s it for?</label>
          <input id="who" className={inputCls} value={recipientLabel} onChange={(e) => setRecipientLabel(e.target.value)}
            placeholder="your sister, a close friend, your dad…" disabled={!!created} />
        </div>
        <div className="flex flex-col gap-1.5 pt-1">
          <label htmlFor="note" className={sectionLabel}>What made you think of them?</label>
          <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={!!created} maxLength={500}
            className="w-full rounded-control border border-giver-input bg-surface px-3 py-2 text-[14px] leading-5 text-ink outline-none transition-colors focus:border-ink focus:ring-1 focus:ring-ink"
            placeholder="Your new place deserves a proper view, even on grey days." />
          <p className="text-[12px] text-giver-text2">They read this first. It stays with the gift even if they choose another.</p>
          {ctx?.about && !note.trim() && !created && (
            <button type="button" onClick={() => setNote(ctx.about!)}
              className="fade-in self-start text-left text-[13px] text-ink underline underline-offset-[3px]">
              Start from what you told us: “{ctx.about.length > 48 ? `${ctx.about.slice(0, 47)}…` : ctx.about}”
            </button>
          )}
        </div>
        {notePhotos.length > 0 && (
          <Card className="flex flex-col gap-3 p-3.5">
            <div>
              <h2 className="text-[15px] font-[650] leading-5">Add a photo to your note · optional</h2>
              <p className="pt-0.5 text-[13px] leading-[18px] text-giver-text2">
                {chosenPhoto !== null ? "They’ll see it as a polaroid tucked into your note. It’s saved only with this gift." : "Pick one of your photos, like one of you two. Unpicked photos stay private."}
              </p>
            </div>
            <div className="flex items-end gap-3 overflow-x-auto pb-1 pt-2" role="group" aria-label="Photo for your note">
              {notePhotos.map((p, i) => (
                <button key={i} type="button" aria-pressed={chosenPhoto === i} aria-label={`Use photo ${i + 1}${p.people ? " (photo of us)" : ""}`}
                  onClick={() => setPhotoChoice(chosenPhoto === i ? null : i)}
                  className={`press shrink-0 rounded-[4px] p-1 ${chosenPhoto === i ? "ring-2 ring-ink" : "opacity-60 hover:opacity-100"}`}>
                  <Polaroid src={`data:${p.contentType};base64,${p.data}`} caption={p.people ? "you two" : undefined} tilt={i % 2 ? 3 : -3} size={78} />
                </button>
              ))}
              <button type="button" aria-pressed={chosenPhoto === null} onClick={() => setPhotoChoice(null)}
                className={`press flex h-[96px] w-[70px] shrink-0 items-center justify-center rounded-[4px] border border-dashed text-[12px] font-medium ${chosenPhoto === null ? "border-ink text-ink" : "border-giver-input text-giver-text2"}`}>
                No photo
              </button>
            </div>
          </Card>
        )}
        <fieldset disabled={creating} className="flex flex-col gap-2">
          <legend className={`${sectionLabel} pb-1.5 pt-1`}>How would you like to give it?</legend>
          {([
            { value: "ship_to_recipient", title: "Ship directly to them", description: "They’ll add their delivery address when they confirm." },
            { value: "give_in_person", title: "Give it in person", description: "Ship it to yourself and hand it to them. Enter your address at merchant checkout." },
          ] as const).map(option => <label key={option.value} className={`press flex cursor-pointer items-start gap-3 rounded-card border bg-surface p-3.5 ${deliveryMethod === option.value ? "border-ink ring-1 ring-ink" : "border-giver-border hover:border-giver-input"}`}>
            <input type="radio" name="delivery-method" value={option.value} checked={deliveryMethod === option.value} onChange={() => setDeliveryMethod(option.value)} className="mt-1 h-4 w-4 shrink-0 accent-ink" />
            <span><span className="block text-[14px] font-semibold">{option.title}</span><span className="block pt-1 text-[13px] text-giver-text2">{option.description}</span></span>
          </label>)}
          <p className="text-[12px] text-giver-text2">This choice is saved when you create the link.</p>
        </fieldset>

        {/* Notify: on unless the giver opts out. */}
        <Card className="flex flex-col gap-2.5 p-3.5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-ink" />
            <span>
              <span className="block text-[15px] font-[650]">Email me when they choose</span>
              <span className="block pt-0.5 text-[13px] leading-[18px] text-giver-text2">
                {notify ? "So you know the moment it’s time to finish the purchase." : "You can still check the gift’s status page any time."}
              </span>
            </span>
          </label>
          {notify && (sessionEmail ? (
            <p className="fade-in flex items-center gap-1.5 text-[13px] font-medium text-success-text">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white"><CheckIcon size={10} /></span>
              We’ll email <span className="break-all">{sessionEmail}</span>
            </p>
          ) : sessionEmail === null && (
            <div className="fade-in flex flex-col gap-1">
              <label htmlFor="notify-email" className="text-[13px] font-medium text-giver-text2">Your email</label>
              <input id="notify-email" type="email" autoComplete="email" inputMode="email" className={inputCls} value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)} placeholder="you@example.com" />
              <p className="text-[12px] text-giver-text2">We’ll send a one-tap link to confirm it’s you, then only email you about this gift.</p>
            </div>
          ))}
        </Card>
      </main>}

      <section aria-label={created ? "Share your gift" : "Create your gift"} className={created ? "flex flex-1 flex-col gap-3 px-5 pb-4" : "sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3"}>
        {created && (
          <div className="flex flex-col items-center gap-3 pt-4 text-center">
            <span className="relative flex h-20 w-20 items-center justify-center">
              <span className="pop absolute inset-0 rounded-full bg-ink" />
              <span className="pop relative text-white" style={stagger(1, 120)}><BowMark size={38} /></span>
              <Confetti pieces={18} spread={140} delay={200} />
            </span>
            <h1 className="rise font-display text-[28px] font-semibold leading-[34px]" style={stagger(1, 90, 150)}>Your gift is ready to share</h1>
            <p className="rise text-[14px] leading-5 text-giver-text2" style={stagger(2, 90, 150)}>Send the link to {recipientLabel.trim() || "them"}. They’ll open your note first.</p>
          </div>
        )}
        {created ? (
          <Card className="rise flex flex-col gap-2 p-3" style={stagger(3, 90, 150)}>
            <span className="text-[13px] font-[650]">Your gift link</span>
            <p className="text-[13px] text-giver-text2">{deliveryMethod === "give_in_person" ? "Give it in person · They’ll confirm their gift; you’ll ship it to yourself." : "Ship directly to them · They’ll confirm their gift and delivery address."}</p>
            <div className="flex items-center gap-2">
              <input readOnly value={created.url} onFocus={(e) => e.currentTarget.select()} aria-label="Gift link"
                className={`${inputCls} tabular flex-1 text-[13px]`} />
              <SecondaryButton onClick={copy} className={`!h-10 !w-auto shrink-0 gap-1 px-3 text-[13px] ${copied ? "!border-ink" : ""}`}>{copied ? <><span className="pop flex"><CheckIcon size={12} /></span>Copied</> : "Copy"}</SecondaryButton>
            </div>
            <div className="grid grid-cols-4 gap-2" aria-label="Send gift link">
              <SecondaryButton onClick={() => void sendVia("text")} className="!h-11 !flex-col !gap-0.5 !px-1 !text-[12px]">
                <MessageIcon />
                <span>Text</span>
              </SecondaryButton>
              <SecondaryButton onClick={() => void sendVia("gmail")} className="!h-11 !flex-col !gap-0.5 !px-1 !text-[12px]">
                <MailIcon />
                <span>Gmail</span>
              </SecondaryButton>
              <SecondaryButton onClick={() => void sendVia("instagram")} className="!h-11 !flex-col !gap-0.5 !px-1 !text-[12px]">
                <InstagramIcon />
                <span>Instagram</span>
              </SecondaryButton>
              <SecondaryButton onClick={() => void sendVia("more")} className="!h-11 !flex-col !gap-0.5 !px-1 !text-[12px]">
                <ShareIcon />
                <span>More</span>
              </SecondaryButton>
            </div>
            {shareNotice && <p className="text-[12px] text-giver-text2" role="status">{shareNotice}</p>}
            <p className="text-[12px] text-giver-text2">
              Nothing sends automatically. <a href={`/gift/${created.id}`} className="underline underline-offset-[3px]">Track it here</a>.
            </p>
          </Card>
        ) : (
          <>
            <PrimaryButton onClick={() => void create()} disabled={!canCreate}>
              {creating ? "Creating…" : "Create gift link"}
            </PrimaryButton>
            <p className="pt-2 text-center text-[12px] text-giver-text2">{createError ?? (notify && !sessionEmail && notifyEmail.trim() && !validEmail(notifyEmail.trim()) ? "Check your email address, or turn off the email above." : notify && !sessionEmail && !notifyEmail.trim() ? "Add your email above to be notified, or turn it off." : "Nothing is charged until they confirm.")}</p>
          </>
        )}
        {created && notifyError && <p role="alert" className="text-[13px] text-giver-text2">Your link is ready, but the verification email didn’t send: {notifyError}</p>}
        {created && <GiverEmail giftId={created.id} pendingEmail={sentTo ?? undefined} />}
        <CreditFooter />
      </section>
    </Screen>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
      <BackButton href="/" />
      <span className="font-display text-[19px] font-semibold">Your pick</span>
      <span className="ml-auto"><MyGiftsLink /></span>
    </div>
  );
}
