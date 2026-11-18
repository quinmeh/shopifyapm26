"use client";

import Link from "next/link";
import { GiverEmail } from "./giver-email";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Gift } from "@/lib/types";
import type { CheckoutCheck } from "@/lib/checkout";
import { toRecipientGift } from "@/lib/recipient";
import { OpenScreen } from "./open-screen";
import { MyGiftsLink } from "./my-gifts-link";
import { AppHeader, BowMark, Card, CreditFooter, DrawnCheck, PrimaryButton, Screen, SecondaryButton, Spinner, TextLinkButton, inputCls } from "./ui";

const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n / 100);

export function GiftStatusScreen({ initialGift }: { initialGift: Gift }) {
  const [gift, setGift] = useState(initialGift);
  const [check, setCheck] = useState<CheckoutCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [url, setUrl] = useState("");
  const [selfChoice, setSelfChoice] = useState<Gift["confirmation"]>();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const cancelCardRef = useRef<HTMLDivElement>(null);
  // The confirm card opens at the bottom of the page; bring it above the pinned footer.
  useEffect(() => {
    if (confirmCancel) cancelCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [confirmCancel]);
  const c = gift.confirmation;
  const inPerson = gift.deliveryMethod === "give_in_person";
  const address = inPerson ? undefined : c?.address;
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
  async function copyDelivery() {
    if (!address) return;
    const details = [address.fullName, address.line1, address.line2, `${address.city}, ${address.region} ${address.postalCode}`, address.country].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(details);
      setNotice("Delivery details copied. Use them for the shipping address at merchant checkout.");
    } catch { setNotice("Couldn’t copy. Select the delivery details above and copy them manually."); }
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
  async function cancelGift() {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/gifts/${gift.id}/cancel`, { method: "POST" });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setGift(result); setCheck(null); setConfirmCancel(false); setNotice("");
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t cancel the gift."); }
    finally { setBusy(false); }
  }
  async function proceed() {
    if (!check || busy) return;
    // Reserve the tab during the click so the async stock check doesn't cause
    // popup blockers to reject the merchant navigation afterward.
    const checkoutTab = window.open("about:blank", "_blank");
    if (!checkoutTab) {
      setNotice("Allow pop-ups for this site, then click the checkout button again.");
      return;
    }
    checkoutTab.opener = null;
    checkoutTab.document.title = "Checking your gift";
    checkoutTab.document.body.textContent = "Checking price and stock before opening merchant checkout…";
    const referrer = checkoutTab.document.createElement("meta");
    referrer.name = "referrer";
    referrer.content = "no-referrer";
    checkoutTab.document.head.append(referrer);
    let opened = false;
    setNotice("");
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/gifts/${gift.id}/checkout`, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ proceed: true, acceptedCents: check.newCents }) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setCheck(result);
      if (result.proceed && result.checkoutUrl) {
        setGift(g => ({ ...g, status: "completed" }));
        if (!checkoutTab.closed) {
          checkoutTab.location.replace(result.checkoutUrl);
          opened = true;
        } else {
          setNotice("The checkout tab was closed. Use the checkout button below to open it again.");
        }
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t open checkout."); }
    finally {
      if (!opened && !checkoutTab.closed) checkoutTab.close();
      setBusy(false);
    }
  }

  if (selfChoice) return <OpenScreen gift={toRecipientGift(gift)} initialProduct={gift.approvedSwaps.find(p => p.id !== selfChoice.chosenProductId) ?? gift.pick}
    initialAddress={selfChoice.address} onConfirmed={() => { setSelfChoice(undefined); void refresh().catch(() => setError("Refresh this page to see your choice.")); }} />;

  const header = <AppHeader right={<span className="flex items-center gap-3"><MyGiftsLink refreshKey={gift.status} /><Link href="/" className="flex min-h-11 items-center text-[13px] underline">New gift</Link></span>} />;
  if (gift.status === "cancelled") return <Screen theme="giver">
    {header}
    <main className="stagger-children flex flex-1 flex-col gap-2.5 px-5 pb-6">
      <Card className="flex flex-col gap-2 p-4">
        <h1 className="font-display text-[28px] font-semibold leading-[34px]">Gift cancelled</h1>
        <p className="text-[14px] leading-5 text-giver-text2">The link for {gift.recipientLabel} no longer works. They’ll see a short note that it’s no longer available.{gift.cancelledAt ? ` Cancelled ${new Date(gift.cancelledAt).toLocaleDateString()}.` : ""}</p>
        <p className="text-[13px] text-giver-text2">{chosen.title}</p>
      </Card>
      <PrimaryButton href="/">Start a new gift</PrimaryButton>
    </main>
  </Screen>;

  const merchant = check?.sellerName ?? chosen.sellerName ?? "the shop";
  const person = gift.recipientLabel.charAt(0).toUpperCase() + gift.recipientLabel.slice(1);
  return <Screen theme="giver">
    {header}
    <main className="stagger-children flex flex-1 flex-col gap-2.5 px-5 pb-4">
      {!c ? <Card className="flex flex-col gap-3 p-3.5">
        <span className="flex items-center gap-2 text-[12px] font-medium text-giver-text2">
          <span className="relative flex h-2.5 w-2.5"><span aria-hidden="true" className="ring absolute inset-0 rounded-full bg-ink" /><span className="relative h-2.5 w-2.5 rounded-full bg-ink" /></span>
          Link sent · checking every few seconds
        </span>
        <h1 className="font-display text-[28px] font-semibold leading-[34px]">Waiting for {gift.recipientLabel} to choose</h1>
        <p className="text-[14px] text-giver-text2">{inPerson ? "They’ll confirm their gift and options. You’ll ship it to yourself and give it in person." : "They’ll confirm the details and add their address."} Nothing has been charged.</p>
        <p className="text-[13px] font-medium">Delivery: {inPerson ? "Give it in person" : "Ship directly to them"}</p>
        <input readOnly aria-label="Gift link" value={url} className={inputCls} onFocus={e => e.currentTarget.select()} />
        <SecondaryButton onClick={() => void copy()}>Copy link again</SecondaryButton>
        <TextLinkButton onClick={() => void refresh().catch(() => setError("Couldn’t refresh. Try again."))}>Refresh status</TextLinkButton>
      </Card> : <>
        <div className="flex gap-3 rounded-card bg-success-tint p-3.5 text-success-text">
          <span className="pop flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white"><DrawnCheck delay={220} /></span>
          <div><h1 className="text-[15px] font-[650]">{gift.status === "completed" ? "Merchant checkout opened" : c.chosenProductId === gift.pick.id ? `${person} loved your pick` : `${person} chose ${chosen.shortName}`}</h1>
            <p className="pt-1 text-[13px] leading-[18px]">{gift.status === "completed" ? "Prototype completed status · payment has not been verified." : inPerson ? "They confirmed their gift and options. You’ll give it to them in person." : "They confirmed their gift and delivery details. Your note goes with it."}</p></div>
        </div>
        <Card className="p-3.5">
          <div className="flex gap-3">
            {chosen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary merchant CDN
              <img src={chosen.imageUrl} alt="" className="img-reveal h-20 w-20 rounded-control object-cover" />
            )}
            <div className="min-w-0"><h2 className="text-[15px] font-semibold">{chosen.title}{c.variantTitle && c.variantTitle !== "Default" && c.variantTitle !== chosen.title ? ` · ${c.variantTitle}` : ""}</h2><p className="text-[13px] text-giver-text2">{merchant}</p>
              {chosen.rating && <p className="text-[12px]">{chosen.rating.value} ★ ({chosen.rating.count})</p>}
              {(check?.refundPolicyUrl ?? chosen.refundPolicyUrl)?.startsWith("https://") && <a className="text-[13px] underline" href={check?.refundPolicyUrl ?? chosen.refundPolicyUrl} target="_blank" rel="noopener noreferrer">Refund policy</a>}
            </div>
          </div>
          {c.chosenProductId !== gift.pick.id && <p className="pt-2 text-[12px] text-giver-text2">Your original pick: {gift.pick.title}</p>}
          <dl className="mt-3 space-y-2 text-[13px]">
            <Row label="Delivery" value={inPerson ? "Give it in person" : "Ship directly to them"} />
            {address?.fullName && <Row label="Recipient" value={address.fullName} />}
            <Row label="Ship to" value={inPerson ? "Your address at merchant checkout" : address ? [address.line1, address.line2, `${address.city}, ${address.region} ${address.postalCode}`].filter(Boolean).join(", ") : "Recipient’s address"} />
            <Row label="Item" value={money(check?.newCents ?? chosen.priceCents)} />
            <Row label={address ? `Shipping to ${address.city}` : "Shipping to you"} value="Calculated at checkout" />
            <Row label="Arrives" value="5–8 business days · Prototype estimate" />
            <Row label="Item subtotal" value={money(check?.newCents ?? chosen.priceCents)} />
            <Row label="Final total" value="Includes shipping and tax at checkout" />
          </dl>
          <p className="pt-3 text-[13px] text-giver-text2">{inPerson ? "Ship to yourself. Enter your own shipping address at merchant checkout, then give the gift to them in person." : "Enter the recipient’s delivery details at merchant checkout. Their address is not transferred automatically."}</p>
          {address && <TextLinkButton onClick={() => void copyDelivery()}>Copy delivery details</TextLinkButton>}
        </Card>
        {gift.status !== "completed" && <>
          {busy && <Card className="fade-in flex items-center gap-2 p-3.5 text-[13px]"><Spinner /> Re-checking price and stock…</Card>}
          {check && !busy && <Card className={`fade-up p-3.5 text-[14px] ${check.priceChanged || check.soldOut ? "border-warning-border bg-warning-bg" : ""}`}>
            {check.soldOut ? "This one sold out." : check.priceChanged ? `Price changed from ${money(check.oldCents)} to ${money(check.newCents!)}.` : `Price and stock re-checked. You’ll pay on ${merchant}’s own checkout. Nothing was charged before this step.`}
            <p className="pt-1 text-[12px] text-giver-text2">Checked {new Date(check.checkedAt).toLocaleTimeString()}. We check again when you continue.</p>
          </Card>}
          {(check?.soldOut || check?.priceChanged || error) && <SecondaryButton disabled={busy} onClick={() => void reopen()}>Ask them to choose again</SecondaryButton>}
          {check?.soldOut && gift.approvedSwaps.length > 0 && <SecondaryButton disabled={busy} onClick={() => void reopen(true)}>Choose an alternative yourself</SecondaryButton>}
        </>}
        <Card className="p-3.5"><h2 className="flex items-center gap-2 text-[15px] font-semibold"><BowMark size={16} /> How it got here</h2>
          <ol className="mt-3 text-[13px]">
            {["You chose the thought", "They confirmed the details", gift.status === "completed" ? "Merchant checkout opened" : "You finish the purchase"].map((step, i, all) => {
              const done = i < 2 || gift.status === "completed";
              return <li key={step} className="relative flex items-start gap-3 pb-3 last:pb-0">
                {i < all.length - 1 && <span aria-hidden="true" className={`absolute left-[5px] top-3.5 h-[calc(100%-6px)] w-0.5 origin-top ${i < 1 || gift.status === "completed" ? "bg-success" : "bg-giver-border"} pop`} style={{ "--d": `${200 + i * 160}ms`, animationName: "grow" } as React.CSSProperties} />}
                <span className={`pop relative mt-0.5 h-3 w-3 shrink-0 rounded-full ${done ? "bg-success" : "border-2 border-ink bg-surface"}`} style={{ "--d": `${120 + i * 160}ms` } as React.CSSProperties} />
                <span className={done ? "" : "font-semibold"}>{step}</span>
              </li>;
            })}
          </ol></Card>
      </>}
      <GiverEmail giftId={gift.id} />
      {/* Cancel: withdraws the recipient link. Two steps so it can't happen by accident. */}
      {!confirmCancel ? (
        <div className="flex justify-center pt-1">
          <TextLinkButton onClick={() => setConfirmCancel(true)} className="!text-giver-text2">Cancel this gift</TextLinkButton>
        </div>
      ) : (
        <div ref={cancelCardRef}><Card className="fade-up flex flex-col gap-2.5 border-warning-border bg-warning-bg p-3.5">
          <h2 className="text-[15px] font-semibold">Cancel this gift?</h2>
          <p className="text-[13px] leading-[18px]">
            The link stops working and {gift.recipientLabel} will see that it’s no longer available.
            {gift.status === "completed" ? " Anything you bought at the merchant isn’t affected; contact the shop to change an order." : ""}
            {gift.hasPhoto ? " Your photo will be deleted." : ""} This can’t be undone.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setConfirmCancel(false)} disabled={busy}>Keep it</SecondaryButton>
            <PrimaryButton onClick={() => void cancelGift()} disabled={busy}>{busy ? "Cancelling…" : "Cancel gift"}</PrimaryButton>
          </div>
        </Card></div>
      )}
      {notice && <p role="status" className="text-[13px] text-giver-text2">{notice}</p>}
      {error && <Card className="fade-up p-3.5"><p role="alert" className="text-[13px]">{error}</p>{c && <TextLinkButton onClick={() => void recheck()}>Try the check again</TextLinkButton>}</Card>}
    </main>
    <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
      {c && <PrimaryButton disabled={busy || !check || check.soldOut || !!error} onClick={() => void proceed()}>{busy ? "Checking…" : check?.soldOut ? "Currently sold out" : check?.priceChanged ? `Continue at ${money(check.newCents!)}` : gift.status === "completed" ? `Open ${merchant} checkout again ↗` : `Complete purchase at ${merchant} ↗`}</PrimaryButton>}
      {c && <p className="pt-2 text-center text-[12px] text-giver-text2">Merchant checkout opens in a new tab.</p>}
      <CreditFooter />
    </footer>
  </Screen>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-giver-text2">{label}</dt><dd className="max-w-[60%] text-right tabular">{value}</dd></div>;
}
