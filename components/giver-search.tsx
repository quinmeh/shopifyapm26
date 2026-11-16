"use client";
// Screen 1 · Start from a photo, with states 1a (reloading) and 1b (no matches). DESIGN.md §4.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductSnapshot } from "@/lib/types";
import { fileToPhoto, PhotoInputCard, type Photo } from "./photo-input-card";
import { LocationPicker, type ShipLocation } from "./location-picker";
import { ProductTile, SkeletonTile } from "./product-tile";
import {
  AppHeader, Card, Chip, CreditFooter, Field, PrimaryButton, Screen, SearchIcon, SecondaryButton,
  TextLinkButton, inputCls,
} from "./ui";

type Budget = { min: number; max: number; label: string };
const BUDGETS: Budget[] = [
  { min: 2500, max: 6000, label: "$25 – $60" },
  { min: 1500, max: 3000, label: "$15 – $30" },
  { min: 6000, max: 12000, label: "$60 – $120" },
];
const WIDE: Budget = { min: 1500, max: 8000, label: "$15 – $80" };
const DEFAULT_OCCASION = "Her first apartment in Seattle";

type Status = "idle" | "loading" | "ready" | "empty" | "error";

export function GiverSearch() {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState(DEFAULT_OCCASION);
  const [budget, setBudget] = useState<Budget>(BUDGETS[0]);
  const [location, setLocation] = useState<ShipLocation>({ label: "Seattle, WA", region: "WA" });
  const [products, setProducts] = useState<ProductSnapshot[]>([]);
  const [makers, setMakers] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<ProductSnapshot | null>(null);
  const [clearedByPhoto, setClearedByPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const occasionRef = useRef<HTMLInputElement>(null);
  const reqId = useRef(0); // stale-response guard

  const search = useCallback(
    async (p: Photo | null, occ: string, b: Budget, reg: string) => {
      const id = ++reqId.current;
      setStatus("loading");
      setSelected(null);
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            photo: p ? { contentType: p.contentType, data: p.data } : undefined,
            occasion: occ,
            budget: { min: b.min, max: b.max },
            region: reg || undefined,
          }),
        });
        if (id !== reqId.current) return; // a newer request superseded this one
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { products: ProductSnapshot[]; makers: number };
        setProducts(json.products);
        setMakers(json.makers);
        setStatus(json.products.length ? "ready" : "empty");
      } catch {
        if (id !== reqId.current) return;
        setStatus("error");
      }
    },
    [],
  );

  // Occasion is debounced for both modes. For photos, it is passed as catalog
  // context without adding a query, so the visual signal stays primary.
  // This also serves as the initial load (status starts as "loading").
  useEffect(() => {
    const t = setTimeout(() => void search(photo, occasion, budget, location.region ?? ""), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- budget/location/photo trigger immediately below
  }, [occasion]);

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    const p = await fileToPhoto(file);
    setPhoto(p);
    setClearedByPhoto(true);
    void search(p, occasion, budget, location.region ?? "");
  };
  const onBudget = (b: Budget) => { setBudget(b); setClearedByPhoto(false); void search(photo, occasion, b, location.region ?? ""); };
  const onLocation = (next: ShipLocation) => { setLocation(next); setClearedByPhoto(false); void search(photo, occasion, budget, next.region ?? ""); };
  const describeInstead = () => {
    setPhoto(null);
    setClearedByPhoto(false);
    void search(null, occasion, budget, location.region ?? "");
    occasionRef.current?.focus();
  };

  const budgetOptions = budget === WIDE ? [...BUDGETS, WIDE] : BUDGETS;
  const loading = status === "loading";

  return (
    <Screen theme="giver">
      <AppHeader right={<Chip>Prototype</Chip>} />

      <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
        <div className="pb-1">
          <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.4px]">Start from something she loves</h1>
          <p className="pt-1 text-[14px] leading-5 text-giver-text2">A photo of her taste finds real gifts from independent makers.</p>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Choose a photo"
          onChange={(e) => void onPhotoFile(e.target.files?.[0])}
        />
        <PhotoInputCard photo={photo} searching={loading} onChange={() => fileRef.current?.click()} />

        <Field label="Occasion · optional" htmlFor="occasion">
          <input
            id="occasion"
            ref={occasionRef}
            className={inputCls}
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="Her first apartment in Seattle"
          />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Budget" htmlFor="budget">
            <select id="budget" className={inputCls} value={budget.label} onChange={(e) => onBudget(budgetOptions.find((b) => b.label === e.target.value)!)}>
              {budgetOptions.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
            </select>
          </Field>
          <Field label="Ships to" htmlFor="ships">
            <LocationPicker value={location} onChange={onLocation} />
          </Field>
        </div>

        {status === "empty" ? (
          <EmptyState
            photo={photo}
            budget={budget}
            location={location}
            occasion={occasion}
            onTryPhoto={() => fileRef.current?.click()}
            onWiden={() => onBudget(WIDE)}
            onDescribe={describeInstead}
          />
        ) : (
          <>
            <div className="flex items-baseline justify-between pt-1">
              <h2 className="text-[15px] font-[650] leading-5">
                {loading
                  ? photo ? `Finding gifts that match her ${photo.title}…` : "Finding gifts…"
                  : "Matches her taste"}
              </h2>
              {!loading && status === "ready" && (
                <span className="text-[12px] text-giver-text2">{products.length} gifts · {makers} makers</span>
              )}
            </div>

            {status === "error" ? (
              <Card className="p-4 text-center">
                <p className="text-[14px]">Couldn’t reach the catalog.</p>
                <TextLinkButton onClick={() => void search(photo, occasion, budget, location.region ?? "")}>Try again</TextLinkButton>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2.5" aria-busy={loading} aria-live="polite">
                {loading
                  ? Array.from({ length: 4 }, (_, i) => <SkeletonTile key={i} />)
                  : products.map((p) => (
                      <ProductTile
                        key={p.id}
                        product={p}
                        selected={selected?.id === p.id}
                        onSelect={() => setSelected(selected?.id === p.id ? null : p)}
                      />
                    ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
        <PrimaryButton
          disabled={!selected || loading}
          href={selected ? `/pick/${encodeURIComponent(selected.id)}` : undefined}
          onClick={() => {
            // Hand the snapshot to /pick without a refetch (M2 reads it; falls back to get_product).
            if (selected) sessionStorage.setItem(`gc:pick:${selected.id}`, JSON.stringify(selected));
          }}
        >
          {selected && !loading ? `Choose ${selected.shortName}` : "Choose a gift"}
        </PrimaryButton>
        {loading && clearedByPhoto && (
          <p className="pt-2 text-center text-[12px] text-giver-text2">Previous selection cleared · new photo, new matches</p>
        )}
        <CreditFooter />
      </footer>
    </Screen>
  );
}

function EmptyState({
  photo, budget, location, occasion, onTryPhoto, onWiden, onDescribe,
}: {
  photo: Photo | null; budget: Budget; location: ShipLocation; occasion: string;
  onTryPhoto: () => void; onWiden: () => void; onDescribe: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip>{budget.label}</Chip>
        <Chip>{location.label}</Chip>
        {occasion && <Chip>{occasion}</Chip>}
      </div>
      <div className="flex flex-col items-center gap-2 px-4 pt-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-ink">
          <SearchIcon />
        </span>
        <h2 className="pt-1 text-[17px] font-[650] leading-[22px]">{photo ? "Nothing matched this photo" : "Nothing matched"}</h2>
        <p className="text-[14px] leading-5 text-giver-text2">
          Photos of objects she owns or likes work best. Landscapes and people are hard to match to gifts.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <PrimaryButton onClick={onTryPhoto}>Try a different photo</PrimaryButton>
        {budget !== WIDE && <SecondaryButton onClick={onWiden}>Widen budget to {WIDE.label}</SecondaryButton>}
        {photo && <TextLinkButton onClick={onDescribe}>Describe her in words instead</TextLinkButton>}
      </div>
    </div>
  );
}
