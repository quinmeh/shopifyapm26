"use client";
// Screen 1 · Start from a photo → Screen 1c · Her matches (photo read + cues + grid).
// States 1a (reloading) and 1b (no matches) live on the matches step. DESIGN.md §4.
import { useCallback, useRef, useState } from "react";
import type { ProductSnapshot } from "@/lib/types";
import { AnalysisCard, type AnalysisResult, type Cue } from "./analysis-card";
import { fileToPhoto, PhotoInputCard, type Photo } from "./photo-input-card";
import { LocationPicker, type ShipLocation } from "./location-picker";
import { ProductTile, SkeletonTile } from "./product-tile";
import {
  AppHeader, BackButton, Card, Chip, CreditFooter, Field, PrimaryButton, Screen, SearchIcon,
  SecondaryButton, TextLinkButton, inputCls,
} from "./ui";

type Budget = { min: number; max: number; label: string };
const BUDGETS: Budget[] = [
  { min: 2500, max: 6000, label: "$25 – $60" },
  { min: 1500, max: 3000, label: "$15 – $30" },
  { min: 6000, max: 12000, label: "$60 – $120" },
];
const WIDE: Budget = { min: 1500, max: 8000, label: "$15 – $80" };
const DEFAULT_OCCASION = "Her first apartment in Seattle";

type Step = "setup" | "matches";
type Status = "loading" | "ready" | "empty" | "error";

export function GiverSearch() {
  const [step, setStep] = useState<Step>("setup");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState(DEFAULT_OCCASION);
  const [budget, setBudget] = useState<Budget>(BUDGETS[0]);
  const [location, setLocation] = useState<ShipLocation>({ label: "Seattle, WA", region: "WA" });

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cue, setCue] = useState<Cue | null>(null); // null = everything in the photo

  const [products, setProducts] = useState<ProductSnapshot[]>([]);
  const [makers, setMakers] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<ProductSnapshot | null>(null);
  const [clearedByPhoto, setClearedByPhoto] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const searchReq = useRef(0); // stale-response guards
  const analyzeReq = useRef(0);

  // One search. A cue means "text search on that theme"; otherwise photo → pure visual, no photo → occasion text.
  const search = useCallback(async (p: Photo | null, c: Cue | null, occ: string, b: Budget, reg: string) => {
    const id = ++searchReq.current;
    setStatus("loading");
    setSelected(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          photo: p && !c ? { contentType: p.contentType, data: p.data } : undefined,
          occasion: occ,
          cue: c?.query,
          budget: { min: b.min, max: b.max },
          region: reg || undefined,
        }),
      });
      if (id !== searchReq.current) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { products: ProductSnapshot[]; makers: number };
      setProducts(json.products);
      setMakers(json.makers);
      setStatus(json.products.length ? "ready" : "empty");
    } catch {
      if (id === searchReq.current) setStatus("error");
    }
  }, []);

  const analyze = useCallback(async (p: Photo, occ: string) => {
    const id = ++analyzeReq.current;
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo: { contentType: p.contentType, data: p.data }, occasion: occ }),
      });
      if (id !== analyzeReq.current) return;
      setAnalysis(res.ok ? ((await res.json()) as AnalysisResult) : { read: null, cues: [], unavailable: "error" });
    } catch {
      if (id === analyzeReq.current) setAnalysis({ read: null, cues: [], unavailable: "error" });
    } finally {
      if (id === analyzeReq.current) setAnalyzing(false);
    }
  }, []);

  const region = location.region ?? "";

  // "Find gifts": run the photo read and the visual search in parallel, then show the matches step.
  const findGifts = () => {
    setStep("matches");
    setCue(null);
    setClearedByPhoto(false);
    if (photo) void analyze(photo, occasion);
    else setAnalysis(null);
    void search(photo, null, occasion, budget, region);
  };

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    const p = await fileToPhoto(file);
    setPhoto(p);
    if (step === "matches") {
      setCue(null);
      setClearedByPhoto(true);
      void analyze(p, occasion);
      void search(p, null, occasion, budget, region);
    }
  };
  const onCue = (c: Cue | null) => { setCue(c); setClearedByPhoto(false); void search(photo, c, occasion, budget, region); };
  const onBudget = (b: Budget) => { setBudget(b); setClearedByPhoto(false); void search(photo, cue, occasion, b, region); };
  const onLocation = (next: ShipLocation) => { setLocation(next); setClearedByPhoto(false); void search(photo, cue, occasion, budget, next.region ?? ""); };
  const describeInstead = () => {
    setPhoto(null);
    setAnalysis(null);
    setCue(null);
    setStep("setup");
  };

  const budgetOptions = budget === WIDE ? [...BUDGETS, WIDE] : BUDGETS;
  const loading = status === "loading";

  const fileInput = (
    <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose a photo"
      onChange={(e) => void onPhotoFile(e.target.files?.[0])} />
  );

  // ---------------- Screen 1 · setup ----------------
  if (step === "setup") {
    return (
      <Screen theme="giver">
        <AppHeader right={<Chip>Prototype</Chip>} />
        <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
          <div className="pb-1">
            <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.4px]">Start from something she loves</h1>
            <p className="pt-1 text-[14px] leading-5 text-giver-text2">A photo of her taste finds real gifts from independent makers.</p>
          </div>
          {fileInput}
          <PhotoInputCard photo={photo} searching={false} onChange={() => fileRef.current?.click()} />
          <Field label="Occasion · optional" htmlFor="occasion">
            <input id="occasion" className={inputCls} value={occasion} onChange={(e) => setOccasion(e.target.value)}
              placeholder="Her first apartment in Seattle" />
          </Field>
          <FiltersRow budget={budget} budgetOptions={budgetOptions} location={location}
            onBudget={(b) => setBudget(b)} onLocation={(l) => setLocation(l)} />
        </main>
        <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
          <PrimaryButton onClick={findGifts}>{photo ? "Find gifts from her photo" : "Find gifts"}</PrimaryButton>
          <p className="pt-2 text-center text-[12px] text-giver-text2">
            {photo ? "We’ll read the photo, then show real matches." : "No photo yet — we’ll match on the occasion instead."}
          </p>
          <CreditFooter />
        </footer>
      </Screen>
    );
  }

  // ---------------- Screen 1c · matches ----------------
  const sectionTitle = loading
    ? cue ? `Finding gifts for the ${cue.label}…` : photo ? `Finding gifts that match her ${photo.title}…` : "Finding gifts…"
    : cue ? `Gifts for the ${cue.label}` : "Matches her taste";

  return (
    <Screen theme="giver">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <BackButton onClick={() => setStep("setup")} />
        <span className="text-[15px] font-[650]">Her matches</span>
        <span className="ml-auto"><Chip>Prototype</Chip></span>
      </div>

      <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
        {fileInput}
        <PhotoInputCard photo={photo} searching={loading && clearedByPhoto} onChange={() => fileRef.current?.click()} />
        {photo && <AnalysisCard analysis={analysis} loading={analyzing} active={cue} onPick={onCue} />}
        <FiltersRow budget={budget} budgetOptions={budgetOptions} location={location} onBudget={onBudget} onLocation={onLocation} />

        {status === "empty" ? (
          <EmptyState photo={photo} budget={budget} location={location} occasion={occasion} cue={cue}
            onTryPhoto={() => fileRef.current?.click()} onWiden={() => onBudget(WIDE)} onDescribe={describeInstead}
            onEverything={() => onCue(null)} />
        ) : (
          <>
            <div className="flex items-baseline justify-between pt-1">
              <h2 className="text-[15px] font-[650] leading-5">{sectionTitle}</h2>
              {status === "ready" && <span className="text-[12px] text-giver-text2">{products.length} gifts · {makers} makers</span>}
            </div>
            {status === "error" ? (
              <Card className="p-4 text-center">
                <p className="text-[14px]">Couldn’t reach the catalog.</p>
                <TextLinkButton onClick={() => void search(photo, cue, occasion, budget, region)}>Try again</TextLinkButton>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2.5" aria-busy={loading} aria-live="polite">
                {loading
                  ? Array.from({ length: 4 }, (_, i) => <SkeletonTile key={i} />)
                  : products.map((p) => (
                      <ProductTile key={p.id} product={p} selected={selected?.id === p.id}
                        onSelect={() => setSelected(selected?.id === p.id ? null : p)} />
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
          onClick={() => { if (selected) sessionStorage.setItem(`gc:pick:${selected.id}`, JSON.stringify(selected)); }}
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

function FiltersRow({ budget, budgetOptions, location, onBudget, onLocation }: {
  budget: Budget; budgetOptions: Budget[]; location: ShipLocation;
  onBudget: (b: Budget) => void; onLocation: (l: ShipLocation) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <Field label="Budget" htmlFor="budget">
        <select id="budget" className={inputCls} value={budget.label}
          onChange={(e) => onBudget(budgetOptions.find((b) => b.label === e.target.value)!)}>
          {budgetOptions.map((b) => <option key={b.label} value={b.label}>{b.label}</option>)}
        </select>
      </Field>
      <Field label="Ships to" htmlFor="ships">
        <LocationPicker value={location} onChange={onLocation} />
      </Field>
    </div>
  );
}

function EmptyState({ photo, budget, location, occasion, cue, onTryPhoto, onWiden, onDescribe, onEverything }: {
  photo: Photo | null; budget: Budget; location: ShipLocation; occasion: string; cue: Cue | null;
  onTryPhoto: () => void; onWiden: () => void; onDescribe: () => void; onEverything: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip>{budget.label}</Chip>
        <Chip>{location.label}</Chip>
        {cue ? <Chip>{cue.label}</Chip> : occasion && <Chip>{occasion}</Chip>}
      </div>
      <div className="flex flex-col items-center gap-2 px-4 pt-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-ink"><SearchIcon /></span>
        <h2 className="pt-1 text-[17px] font-[650] leading-[22px]">
          {cue ? `Nothing for the ${cue.label} in this budget` : photo ? "Nothing matched this photo" : "Nothing matched"}
        </h2>
        <p className="text-[14px] leading-5 text-giver-text2">
          Photos of objects she owns or likes work best. Landscapes and people are hard to match to gifts.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        {cue ? <PrimaryButton onClick={onEverything}>Back to everything in the photo</PrimaryButton>
             : <PrimaryButton onClick={onTryPhoto}>Try a different photo</PrimaryButton>}
        {budget !== WIDE && <SecondaryButton onClick={onWiden}>Widen budget to {WIDE.label}</SecondaryButton>}
        {photo && <TextLinkButton onClick={onDescribe}>Describe her in words instead</TextLinkButton>}
      </div>
    </div>
  );
}
