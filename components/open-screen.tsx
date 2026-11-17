"use client";
// Screen 4 · Love it or choose another (`/g/[id]/open`) + 4a swap sheet. DESIGN.md §4. Gift theme.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { possessive } from "@/lib/recipient";
import type { Address, OptionGroup, RecipientGift, RecipientProduct, RecipientVariant } from "@/lib/types";
import { AlsoLikedTag, BottomSheet, GiftCard, OptionRow, SizePill, WhyCard } from "./gift-ui";
import { BackButton, PrimaryButton, Spinner, TextLinkButton } from "./ui";
import { Screen } from "./ui";
import { AddressSearch } from "./address-search";

type Selections = Record<string, string>;
type AddressForm = Omit<Address, "country">;
const EMPTY: AddressForm = { fullName: "", line1: "", line2: "", city: "", region: "", postalCode: "" };

export function OpenScreen({ gift, initialProduct, initialAddress, onConfirmed }: { gift: RecipientGift; initialProduct?: RecipientProduct; initialAddress?: AddressForm; onConfirmed?: () => void }) {
  const router = useRouter();
  const giver = gift.giverName;
  const inPerson = gift.deliveryMethod === "give_in_person";
  const [chosen, setChosen] = useState<RecipientProduct>(initialProduct ?? gift.pick);
  const [options, setOptions] = useState<OptionGroup[] | null>(null);
  const [selections, setSelections] = useState<Selections>({});
  const [variant, setVariant] = useState<RecipientVariant | null>(null);
  const [resolving, setResolving] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [address, setAddress] = useState<AddressForm>(initialAddress ?? EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressForm | "variant", string>>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const req = useRef(0);

  // get_product (recipient view): option groups + the resolved variant for the current selections.
  const load = useCallback(async (productId: string, sel: Selections) => {
    const id = ++req.current;
    setResolving(true);
    setVariant(null);
    try {
      const selected = Object.entries(sel).map(([name, label]) => ({ name, label }));
      const qs = new URLSearchParams({ for: "recipient" });
      if (selected.length) qs.set("selected", JSON.stringify(selected));
      const r = await fetch(`/api/product/${encodeURIComponent(productId)}?${qs}`);
      if (id !== req.current) return;
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as { options: OptionGroup[]; variant: RecipientVariant | null };
      if (id !== req.current) return;
      setOptions(j.options.filter((o) => (o.values ?? []).some((v) => v.exists !== false)));
      setVariant(j.variant);
      setLoadError(false);
    } catch {
      if (id === req.current) setLoadError(true);
    } finally {
      if (id === req.current) setResolving(false);
    }
  }, []);

  useEffect(() => {
    const productId = chosen.id;
    queueMicrotask(() => void load(productId, {}));
  }, [chosen.id, load]);

  const pickOption = (name: string, label: string) => {
    const next = { ...selections, [name]: label };
    setSelections(next);
    setErrors((e) => ({ ...e, variant: undefined }));
    void load(chosen.id, next);
  };

  const chooseProduct = (p: RecipientProduct) => {
    setSheetOpen(false);
    if (p.id === chosen.id) return;
    setChosen(p); // resets variant selection; address is kept
    setSelections({});
    setVariant(null);
    setOptions(null);
  };

  const needsOptions = (options?.length ?? 0) > 0;
  const allChosen = !needsOptions || (options ?? []).every((o) => selections[o.name]);
  const variantReady = allChosen && !!variant?.id && variant.available;

  const validate = () => {
    const e: typeof errors = {};
    if (!inPerson) {
      if (!address.fullName?.trim()) e.fullName = "Add the recipient’s full name.";
      if (!address.line1.trim()) e.line1 = "Add a street address.";
      if (!address.city.trim()) e.city = "Add a city.";
      if (!/^[A-Za-z]{2}$/.test(address.region.trim())) e.region = "2-letter state.";
      if (!/^\d{5}(-\d{4})?$/.test(address.postalCode.trim())) e.postalCode = "5-digit ZIP.";
    }
    if (needsOptions && !allChosen) e.variant = "Pick one of each option.";
    else if (allChosen && variant && !variant.available) e.variant = "That combination is sold out — try another.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirm = async () => {
    if (resolving || loadError || submitting || !validate() || !variantReady) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`/api/gifts/${gift.id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chosenProductId: chosen.id, variantId: variant.id, selected: variant.options, variantTitle: variantLabel(selections, variant), ...(!inPerson ? { address: { ...address, country: "US" } } : {}) }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      if (onConfirmed) onConfirmed();
      else router.push(`/g/${gift.id}/done`);
    } catch {
      setSubmitError("Couldn’t send that. Try again.");
      setSubmitting(false);
    }
  };

  const swapped = chosen.id !== gift.pick.id;
  const others = gift.approvedSwaps.length;
  const field = (key: keyof AddressForm, label: string, extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={`addr-${key}`} className="text-[13px] font-medium text-gift-text2">{label}</label>
      <input id={`addr-${key}`} value={address[key] ?? ""} onChange={(e) => { setAddress({ ...address, [key]: e.target.value }); setErrors((er) => ({ ...er, [key]: undefined })); }}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `err-${key}` : undefined}
        className={`h-10 w-full rounded-control border bg-surface px-3 text-[14px] text-gift-text outline-none focus:border-ink ${errors[key] ? "border-clay" : "border-gift-input"}`} {...extra} />
      {errors[key] && <p id={`err-${key}`} className="text-[13px] text-clay">{errors[key]}</p>}
    </div>
  );

  return (
    <Screen theme="gift">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <BackButton href={onConfirmed ? `/gift/${gift.id}` : `/g/${gift.id}`} />
        <span className="text-[15px] font-[650] text-gift-text">{onConfirmed ? "Choose an alternative" : `Your gift from ${giver}`}</span>
      </div>

      <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
        {/* Item card */}
        <GiftCard className="overflow-hidden">
          <div className="relative h-[168px] w-full bg-skeleton">
            {chosen.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={chosen.imageUrl} alt="" className="h-full w-full object-cover" />
            )}
            {swapped && <AlsoLikedTag giverName={giver} />}
          </div>
          <div className="flex flex-col gap-2 p-3.5">
            <h1 className="text-[17px] font-[650] leading-[22px] text-gift-text">{chosen.title}</h1>
            <p className="text-[13px] text-gift-text2">From {chosen.sellerName ?? "an independent maker"}</p>
            <WhyCard note={gift.note} giverName={giver} />
          </div>
        </GiftCard>

        {/* Options */}
        {loadError && (
          <GiftCard className="p-3.5 text-[13px] text-gift-text2">Couldn’t load the options. <TextLinkButton onClick={() => void load(chosen.id, selections)}>Try again</TextLinkButton></GiftCard>
        )}
        {options === null && !loadError && (
          <GiftCard className="flex items-center gap-2 p-3.5 text-[13px] text-gift-text2"><Spinner label="Loading options" /> Checking what’s in stock…</GiftCard>
        )}
        {(options ?? []).map((o) => (
          <GiftCard key={o.name} className="flex flex-col gap-2.5 p-3.5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[15px] font-[650] text-gift-text">{o.name}</h2>
              {resolving && <Spinner label="Checking stock" />}
            </div>
            <div className="flex flex-wrap gap-2">
              {(o.values ?? []).filter((v) => v.exists !== false).map((v) => (
                <SizePill key={v.label} label={v.label} selected={selections[o.name] === v.label} soldOut={v.available === false}
                  onClick={() => pickOption(o.name, v.label)} />
              ))}
            </div>
          </GiftCard>
        ))}
        {errors.variant && <p className="text-[13px] text-clay">{errors.variant}</p>}

        {/* Address */}
        {inPerson ? <GiftCard className="p-3.5">
          <h2 className="text-[15px] font-[650] text-gift-text">{onConfirmed ? "Give it in person" : `${giver} will give this to you in person.`}</h2>
          <p className="pt-1 text-[13px] text-gift-text2">{onConfirmed ? "Enter your own shipping address at merchant checkout." : "Just confirm your gift and options. No delivery address needed."}</p>
        </GiftCard> : <GiftCard className="flex flex-col gap-2.5 p-3.5">
          <h2 className="text-[15px] font-[650] text-gift-text">Where should we send your gift?</h2>
          {field("fullName", "Recipient’s full name", { autoComplete: "shipping name", maxLength: 100, required: true })}
          <AddressSearch giftId={gift.id} value={address.line1} city={address.city} region={address.region} postalCode={address.postalCode} error={errors.line1} onChange={line1 => {
            setAddress(current => ({ ...current, line1 }));
            setErrors(current => ({ ...current, line1: undefined }));
          }} onSelect={match => {
            setAddress(current => ({ ...current, ...match }));
            setErrors(current => ({ ...current, line1: undefined, city: undefined, region: undefined, postalCode: undefined }));
          }} />
          {field("line2", "Apartment, suite, unit · optional", { autoComplete: "shipping address-line2", maxLength: 120 })}
          <div className="flex gap-2">
            {field("city", "City", { autoComplete: "shipping address-level2", maxLength: 100 })}
            <div className="w-[72px] shrink-0">{field("region", "State", { autoComplete: "shipping address-level1", maxLength: 2, placeholder: "WA" })}</div>
            <div className="w-[96px] shrink-0">{field("postalCode", "ZIP", { autoComplete: "shipping postal-code", inputMode: "numeric", maxLength: 10 })}</div>
          </div>
          <p className="flex items-center gap-1.5 text-[12px] text-gift-text2">
            <LockIcon /> Your address is saved for this gift and shared with the giver to finish checkout.
          </p>
        </GiftCard>}
      </main>

      <footer className="sticky bottom-0 border-t border-gift-border bg-gift-bg px-5 pb-4 pt-3">
        <PrimaryButton onClick={() => void confirm()} disabled={submitting || resolving || loadError || options === null || (allChosen && !variantReady)}>
          {submitting ? "Saving…" : onConfirmed ? "Confirm this alternative" : inPerson ? "Confirm my gift" : "Confirm gift and delivery"}
        </PrimaryButton>
        {submitError && <p className="pt-2 text-center text-[13px] text-clay">{submitError}</p>}
        {others > 0 && (
          <div className="flex justify-center">
            <TextLinkButton onClick={() => setSheetOpen(true)} className="!text-gift-text">
              Not quite right? See {others} {others === 1 ? "other" : "others"} {giver} picked
            </TextLinkButton>
          </div>
        )}
      </footer>

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={`${giver} also liked these`}
        subtitle="Pick whichever feels most like you. The note comes with it.">
        <OptionRow product={gift.pick} current={chosen.id === gift.pick.id} label={chosen.id === gift.pick.id ? "Selected" : `${possessive(giver)} pick`} onClick={() => chooseProduct(gift.pick)} />
        {gift.approvedSwaps.map((s) => (
          <OptionRow key={s.id} product={s} current={chosen.id === s.id} label={chosen.id === s.id ? "Selected" : null} onClick={() => chooseProduct(s)} />
        ))}
      </BottomSheet>
    </Screen>
  );
}

function variantLabel(sel: Selections, v: RecipientVariant): string {
  const parts = Object.values(sel);
  return parts.length ? parts.join(" / ") : v.title ?? "Default";
}

function LockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
