"use client";

import Link from "next/link";
import { GiverEmail } from "./giver-email";
import { useCallback, useEffect, useState } from "react";
import type { Gift } from "@/lib/types";
import type { CheckoutCheck } from "@/lib/checkout";
import { toRecipientGift } from "@/lib/recipient";
import { OpenScreen } from "./open-screen";
import { AppHeader, Card, CheckIcon, CreditFooter, PrimaryButton, Screen, SecondaryButton, Spinner, TextLinkButton, inputCls } from "./ui";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);

export function GiftStatusScreen({ initialGift }: { initialGift: Gift }) {
  const [gift, setGift] = useState(initialGift);
  const [check, setCheck] = useState<CheckoutCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const [selfChoice, setSelfChoice] = useState<Gift["confirmation"]>();
  const [merchantUrl, setMerchantUrl] = useState<string | null>(null);
  const c = gift.confirmation;
  const chosen = [gift.pick, ...gift.approvedSwaps].find(p => p.id === c?.chosenProductId) ?? gift.pick;

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/gifts/${initialGift.id}`, { cache: "no-store" });
    if (!r.ok) throw new Error("Couldn’t refresh the gift.");
    setGift(await r.json());
  }, [initialGift.id]);

  const recheck = useCallback(async () => {
    setBusy(true); setError(""); setCheck(null);
    try {
      const r = await fetch(`/api/gifts/${initialGift.id}/checkout`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setCheck(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t check this item."); }
    finally { setBusy(false); }
  }, [initialGift.id]);

  useEffect(() => {
    queueMicrotask(() => setUrl(`${window.location.origin}/g/${initialGift.id}`));
  }, [initialGift.id]);
  useEffect(() => {
    if (!c) return;
    queueMicrotask(() => void recheck());
  }, [c?.confirmedAt, c?.variantId, gift.status, recheck]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (gift.status !== "sent" || selfChoice) return;
    const timer = setInterval(() => { if (!document.hidden) void refresh().catch(() => {}); }, 10000);
    return () => clearInterval(timer);
  }, [gift.status, refresh, selfChoice]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setNotice("Link copied. Send it to them when you’re ready."); }
    catch { setNotice("Select and copy the link below."); }
  }
  async function reopen(self = false) {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/gifts/${gift.id}/reopen`, { method: "POST" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      if (self) setSelfChoice(c);
      setGift(result); setCheck(null);
      setNotice(self ? "" : "The gift is ready to choose again. Copy and resend the same link.");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t reopen the gift."); }
    finally { setBusy(false); }
  }
  async function proceed() {
    if (!check || busy) return;
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/gifts/${gift.id}/checkout`, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ proceed: true, acceptedCents: check.newCents }) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setCheck(result);
      if (result.proceed && result.checkoutUrl) {
        setMerchantUrl(result.checkoutUrl);
        setGift(g => ({ ...g, status: "completed" }));
        window.location.assign(result.checkoutUrl);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t open checkout."); }
    finally { setBusy(false); }
  }

  if (selfChoice) return <OpenScreen gift={toRecipientGift(gift)} initialProduct={gift.approvedSwaps.find(p => p.id !== selfChoice.chosenProductId) ?? gift.pick}
    initialAddress={selfChoice.address} onConfirmed={() => { setSelfChoice(undefined); void refresh().catch(() => setError("Refresh this page to see your choice.")); }} />;

  const merchant = check?.sellerName ?? chosen.sellerName ?? "the shop";
  const person = gift.recipientLabel.charAt(0).toUpperCase() + gift.recipientLabel.slice(1);
  return <Screen theme="giver">
    <AppHeader right={<Link href="/" className="flex min-h-11 items-center text-[13px] underline">New gift</Link>} />
    <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
      {!c ? <Card className="flex flex-col gap-3 p-3.5">
        <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.4px]">Waiting for {gift.recipientLabel} to choose</h1>
        <p className="text-[14px] text-giver-text2">They’ll confirm the details and add their address. Nothing has been charged.</p>
        <input readOnly aria-label="Gift link" value={url} className={inputCls} onFocus={e => e.currentTarget.select()} />
        <SecondaryButton onClick={() => void copy()}>Copy link again</SecondaryButton>
        <TextLinkButton onClick={() => void refresh().catch(() => setError("Couldn’t refresh. Try again."))}>Refresh status</TextLinkButton>
      </Card> : <>
        <div className="flex gap-3 rounded-card bg-success-tint p-3.5 text-success-text">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white"><CheckIcon /></span>
          <div><h1 className="text-[15px] font-[650]">{gift.status === "completed" ? "Merchant checkout opened" : c.chosenProductId === gift.pick.id ? `${person} loved your pick` : `${person} chose ${chosen.shortName}`}</h1>
            <p className="pt-1 text-[13px] leading-[18px]">{gift.status === "completed" ? "Prototype completed status · payment has not been verified." : `They confirmed ${c.variantTitle} and added their address. Your note goes with it.`}</p></div>
        </div>
        <Card className="p-3.5">
          <div className="flex gap-3">
            {chosen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant CDN
              <img src={chosen.imageUrl} alt="" className="h-20 w-20 rounded-control object-cover" />
            )}
            <div className="min-w-0"><h2 className="text-[15px] font-semibold">{chosen.title} · {c.variantTitle}</h2><p className="text-[13px] text-giver-text2">{merchant}</p>
              {chosen.rating && <p className="text-[12px]">{chosen.rating.value} ★ ({chosen.rating.count})</p>}
              {(check?.refundPolicyUrl ?? chosen.refundPolicyUrl)?.startsWith("https://") && <a className="text-[13px] underline" href={check?.refundPolicyUrl ?? chosen.refundPolicyUrl} target="_blank" rel="noopener noreferrer">Refund policy</a>}
            </div>
          </div>
          {c.chosenProductId !== gift.pick.id && <p className="pt-2 text-[12px] text-giver-text2">Your original pick: {gift.pick.title}</p>}
          <dl className="mt-3 space-y-2 text-[13px]">
            <Row label="Item" value={money(check?.newCents ?? chosen.priceCents)} />
            <Row label={`Shipping to ${c.address.city}`} value="Calculated at checkout" />
            <Row label="Arrives" value="5–8 business days · Prototype estimate" />
            <Row label="Item subtotal" value={money(check?.newCents ?? chosen.priceCents)} />
            <Row label="Final total" value="Includes shipping and tax at checkout" />
          </dl>
        </Card>
        {gift.status !== "completed" && <>
          {busy && <Card className="flex items-center gap-2 p-3.5 text-[13px]"><Spinner /> Re-checking price and stock…</Card>}
          {check && !busy && <Card className={`p-3.5 text-[14px] ${check.priceChanged || check.soldOut ? "border-warning-border bg-warning-bg" : ""}`}>
            {check.soldOut ? "This one sold out." : check.priceChanged ? `Price changed from ${money(check.oldCents)} to ${money(check.newCents!)}.` : `Price and stock re-checked. You’ll pay on ${merchant}’s own checkout. Nothing was charged before this step.`}
            <p className="pt-1 text-[12px] text-giver-text2">Checked {new Date(check.checkedAt).toLocaleTimeString()}. We check again when you continue.</p>
          </Card>}
          {(check?.soldOut || check?.priceChanged || error) && <SecondaryButton disabled={busy} onClick={() => void reopen()}>Ask them to choose again</SecondaryButton>}
          {check?.soldOut && gift.approvedSwaps.length > 0 && <SecondaryButton disabled={busy} onClick={() => void reopen(true)}>Choose an alternative yourself</SecondaryButton>}
        </>}
        <Card className="p-3.5"><h2 className="text-[15px] font-semibold">How it got here</h2><ol className="mt-2 space-y-2 text-[13px]">
          {["You chose the thought", "They confirmed the details", gift.status === "completed" ? "Merchant checkout opened" : "You finish the purchase"].map((step, i) => <li key={step} className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${i < 2 ? "bg-success" : "border-2 border-ink"}`} />{step}</li>)}
        </ol></Card>
      </>}
      <GiverEmail giftId={gift.id} />
      {notice && <p role="status" className="text-[13px] text-giver-text2">{notice}</p>}
      {error && <Card className="p-3.5"><p role="alert" className="text-[13px]">{error}</p>{c && <TextLinkButton onClick={() => void recheck()}>Try the check again</TextLinkButton>}</Card>}
    </main>
    <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
      {c && <PrimaryButton disabled={busy || !check || check.soldOut || !!error} onClick={() => void proceed()}>{busy ? "Checking…" : check?.soldOut ? "Currently sold out" : check?.priceChanged ? `Continue at ${money(check.newCents!)}` : gift.status === "completed" ? `Open ${merchant} checkout again ↗` : `Complete purchase at ${merchant} ↗`}</PrimaryButton>}
      {merchantUrl && <a href={merchantUrl} className="flex min-h-12 items-center justify-center rounded-control bg-ink px-4 text-white">Return to merchant checkout ↗</a>}
      <CreditFooter />
    </footer>
  </Screen>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-giver-text2">{label}</dt><dd className="max-w-[60%] text-right tabular">{value}</dd></div>;
}
