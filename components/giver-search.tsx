"use client";
// Giver flow on `/`: guided setup (1 photo → 2 occasion → 3 budget & ships-to) → 4 reading → 5 matches.
// The occasion leads the search; the photo adds cues the giver can tap. DESIGN.md §4 screens 1·1–1·4, 1c.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductSnapshot } from "@/lib/types";
import { AnalysisCard, type AnalysisResult, type Cue, type View } from "./analysis-card";
import { fileToPhoto, PhotoInputCard, type Photo } from "./photo-input-card";
import { LocationPicker, type ShipLocation } from "./location-picker";
import { ProductTile, SkeletonTile } from "./product-tile";
import {
  AppHeader, BackButton, Card, CheckIcon, Chip, CreditFooter, Field, GiftIcon, PrimaryButton, ProgressDots, Screen,
  SearchIcon, SecondaryButton, Spinner, TextLinkButton, inputCls,
} from "./ui";

type Budget = { min: number; max: number; label: string; hint: string };
const BUDGETS: Budget[] = [
  { min: 1500, max: 3000, label: "$15 – $30", hint: "A small something" },
  { min: 2500, max: 6000, label: "$25 – $60", hint: "Most gifts land here" },
  { min: 6000, max: 12000, label: "$60 – $120", hint: "A proper present" },
];
const WIDE: Budget = { min: 1500, max: 8000, label: "$15 – $80", hint: "Widened" };
const DEFAULT_OCCASION = "First apartment in Seattle";
const OCCASION_IDEAS = ["First apartment in Seattle", "A birthday", "Just because"];

type Step = "photo" | "occasion" | "filters" | "reading" | "matches";
type Status = "loading" | "ready" | "empty" | "error";
type Results = { products: ProductSnapshot[]; makers: number };
type SearchResponse = Results & { mode: string; read?: string | null; cues?: Cue[]; occasion?: { key: string; read: string } };
const GUIDED: Step[] = ["photo", "occasion", "filters"];

export function GiverSearch() {
  const [step, setStep] = useState<Step>("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState(DEFAULT_OCCASION);
  const [budget, setBudget] = useState<Budget>(BUDGETS[1]);
  const [location, setLocation] = useState<ShipLocation>({ label: "Seattle, WA", region: "WA" });

  // Photo read: Claude (optional, needs a key) or catalog-derived cues from the visual search.
  const [claude, setClaude] = useState<AnalysisResult | null>(null);
  const [catalog, setCatalog] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [visual, setVisual] = useState<Results | null>(null); // cached "Looks like the photo" results
  const [visualLoading, setVisualLoading] = useState(false);
  const analysis: AnalysisResult | null = claude && claude.cues.length > 0 ? claude : catalog ?? (analyzing ? null : claude);

  const [view, setView] = useState<View>("occasion");
  const [occasionRead, setOccasionRead] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductSnapshot[]>([]);
  const [makers, setMakers] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<ProductSnapshot | null>(null);
  const [clearedByPhoto, setClearedByPhoto] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const searchReq = useRef(0); // stale-response guards
  const visualReq = useRef(0);
  const analyzeReq = useRef(0);
  const region = location.region ?? "";
  const hasOccasion = occasion.trim().length > 0;

  const post = async (body: object): Promise<SearchResponse> => {
    const res = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as SearchResponse;
  };
  const common = (b: Budget, reg: string, occ: string) => ({ occasion: occ, budget: { min: b.min, max: b.max }, region: reg || undefined });

  // Main grid search for a view. "photo" reuses the cached visual results when present.
  const search = useCallback(async (v: View, p: Photo | null, occ: string, b: Budget, reg: string, cache: Results | null) => {
    const id = ++searchReq.current;
    setStatus("loading");
    setSelected(null);
    try {
      let out: Results;
      if (v === "photo" && cache) out = cache;
      else if (v === "photo") {
        if (!p) throw new Error("no photo");
        const r = await post({ mode: "photo", photo: { contentType: p.contentType, data: p.data }, ...common(b, reg, occ) });
        out = r;
        setVisual({ products: r.products, makers: r.makers });
        setCatalog(r.cues?.length ? { read: r.read ?? null, cues: r.cues, source: "catalog" } : { read: null, cues: [], unavailable: "thin" });
      } else if (v === "occasion") {
        const r = await post({ mode: "occasion", ...common(b, reg, occ) });
        out = r;
        setOccasionRead(r.occasion?.read ?? null);
      } else {
        out = await post({ cue: v.label, ...common(b, reg, occ) });
      }
      if (id !== searchReq.current) return;
      setProducts(out.products);
      setMakers(out.makers);
      setStatus(out.products.length ? "ready" : "empty");
    } catch {
      if (id === searchReq.current) setStatus("error");
    }
  }, []);

  // Visual search in the background: feeds the cues and caches "Looks like the photo".
  const readPhoto = useCallback(async (p: Photo, occ: string, b: Budget, reg: string) => {
    const id = ++visualReq.current;
    setVisualLoading(true);
    setVisual(null);
    setCatalog(null);
    try {
      const r = await post({ mode: "photo", photo: { contentType: p.contentType, data: p.data }, ...common(b, reg, occ) });
      if (id !== visualReq.current) return;
      setVisual({ products: r.products, makers: r.makers });
      setCatalog(r.cues?.length ? { read: r.read ?? null, cues: r.cues, source: "catalog" } : { read: null, cues: [], unavailable: "thin" });
    } catch {
      if (id === visualReq.current) setCatalog({ read: null, cues: [], unavailable: "error" });
    } finally {
      if (id === visualReq.current) setVisualLoading(false);
    }
  }, []);

  const analyze = useCallback(async (p: Photo, occ: string) => {
    const id = ++analyzeReq.current;
    setAnalyzing(true);
    setClaude(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photo: { contentType: p.contentType, data: p.data }, occasion: occ }) });
      if (id !== analyzeReq.current) return;
      const out = res.ok ? ((await res.json()) as AnalysisResult) : { read: null, cues: [], unavailable: "error" };
      setClaude(out.cues.length ? { ...out, source: "claude" } : out);
    } catch {
      if (id === analyzeReq.current) setClaude({ read: null, cues: [], unavailable: "error" });
    } finally {
      if (id === analyzeReq.current) setAnalyzing(false);
    }
  }, []);

  // Everything kicks off here: occasion search (grid) + photo read (cues) in parallel.
  const start = (p: Photo | null, occ: string, b: Budget, reg: string) => {
    const v: View = occ.trim() || !p ? "occasion" : "photo";
    setView(v);
    setOccasionRead(null);
    if (p) { void analyze(p, occ); void readPhoto(p, occ, b, reg); }
    else { setClaude(null); setCatalog(null); setVisual(null); }
    void search(v, p, occ, b, reg, null);
  };
  const findGifts = () => { setStep("reading"); setClearedByPhoto(false); start(photo, occasion, budget, region); };

  const analysisLoading = analyzing || visualLoading;
  const readingDone = step === "reading" && !analysisLoading && status !== "loading";
  useEffect(() => {
    if (!readingDone) return;
    const t = setTimeout(() => setStep("matches"), 1100);
    return () => clearTimeout(t);
  }, [readingDone]);

  const onPhotoFile = async (file: File | undefined) => {
    if (!file) return;
    const p = await fileToPhoto(file);
    setPhoto(p);
    if (step === "matches") { setClearedByPhoto(true); start(p, occasion, budget, region); }
  };
  const onView = (v: View) => { setView(v); setClearedByPhoto(false); void search(v, photo, occasion, budget, region, visual); };
  const onBudget = (b: Budget) => { setBudget(b); setClearedByPhoto(false); setVisual(null); void search(view, photo, occasion, b, region, null); };
  const onLocation = (next: ShipLocation) => { setLocation(next); setClearedByPhoto(false); setVisual(null); void search(view, photo, occasion, budget, next.region ?? "", null); };

  const loading = status === "loading";
  const fileInput = (
    <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Choose a photo"
      onChange={(e) => void onPhotoFile(e.target.files?.[0])} />
  );

  // ---------------- 1 · 2 · 3 — guided setup ----------------
  if (GUIDED.includes(step)) {
    const idx = GUIDED.indexOf(step);
    return (
      <Screen theme="giver">
        <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
          {idx > 0 ? <BackButton onClick={() => setStep(GUIDED[idx - 1])} /> : <AppHeader inline />}
          <span className="ml-auto"><ProgressDots total={GUIDED.length} current={idx} /></span>
        </div>

        <main className="flex flex-1 flex-col gap-4 px-5 pb-4">
          {step === "photo" && (
            <>
              <Heading title="Start from something they love" body="A photo of their taste finds real gifts from independent makers. Their windowsill, their mug, their bookshelf." />
              {fileInput}
              <button type="button" onClick={() => fileRef.current?.click()}
                className={`flex min-h-[260px] flex-1 flex-col items-center justify-center gap-3 overflow-hidden rounded-card bg-surface text-center ${photo ? "border-2 border-ink p-0" : "border border-dashed border-giver-input p-6"}`}>
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local data URL
                  <img src={photo.previewUrl} alt="" className="h-full max-h-[360px] w-full object-cover" />
                ) : (
                  <>
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-giver-bg text-ink"><GiftIcon size={24} /></span>
                    <span className="text-[15px] font-semibold">Add a photo</span>
                    <span className="text-[13px] text-giver-text2">From your camera roll or a screenshot</span>
                  </>
                )}
              </button>
              {photo && <p className="text-center text-[13px] text-giver-text2">{photo.title} · <button type="button" className="underline underline-offset-[3px]" onClick={() => fileRef.current?.click()}>Change</button></p>}
            </>
          )}

          {step === "occasion" && (
            <>
              <Heading title="What’s the occasion?" body="This leads the search — the photo adds the personal touch. It also shapes the note they read first." />
              <Field label="Occasion" htmlFor="occasion">
                <input id="occasion" className={`${inputCls} !h-12 text-[16px]`} value={occasion} autoFocus
                  onChange={(e) => setOccasion(e.target.value)} placeholder="First apartment in Seattle" />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                {OCCASION_IDEAS.map((o) => (
                  <button key={o} type="button" onClick={() => setOccasion(o)} aria-pressed={occasion === o}
                    className={`h-9 rounded-full px-3 text-[13px] font-medium ${occasion === o ? "bg-ink text-white" : "border border-giver-input bg-surface text-ink"}`}>
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "filters" && (
            <>
              <Heading title="Budget, and where it ships" body="Only in-stock gifts that ship there will show." />
              <fieldset className="flex flex-col gap-2">
                <legend className="pb-1 text-[13px] font-medium text-giver-text2">Budget</legend>
                {BUDGETS.map((b) => {
                  const on = budget.label === b.label;
                  return (
                    <button key={b.label} type="button" onClick={() => setBudget(b)} aria-pressed={on}
                      className={`flex h-14 items-center justify-between rounded-card bg-surface px-4 text-left ${on ? "border-2 border-ink" : "border border-giver-border"}`}>
                      <span><span className="tabular block text-[15px] font-semibold">{b.label}</span><span className="text-[12px] text-giver-text2">{b.hint}</span></span>
                      {on && <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white"><CheckIcon size={13} /></span>}
                    </button>
                  );
                })}
              </fieldset>
              <Field label="Ships to" htmlFor="ships">
                <LocationPicker value={location} onChange={setLocation} />
              </Field>
            </>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
          {step === "photo" && (
            <>
              <PrimaryButton disabled={!photo} onClick={() => setStep("occasion")}>Continue</PrimaryButton>
              <div className="flex justify-center"><TextLinkButton onClick={() => { setPhoto(null); setStep("occasion"); }}>Skip — describe them in words instead</TextLinkButton></div>
            </>
          )}
          {step === "occasion" && <PrimaryButton onClick={() => setStep("filters")}>Continue</PrimaryButton>}
          {step === "filters" && (
            <>
              <PrimaryButton onClick={findGifts}>{hasOccasion ? "Find gifts for the occasion" : "Find gifts"}</PrimaryButton>
              <p className="pt-2 text-center text-[12px] text-giver-text2">Nothing is bought until they confirm.</p>
            </>
          )}
          <CreditFooter />
        </footer>
      </Screen>
    );
  }

  // ---------------- 4 — reading ----------------
  if (step === "reading") {
    const cues = analysis?.cues ?? [];
    const readFailed = !!analysis && cues.length === 0;
    const rows: { key: string; label: string; done: boolean; failed?: boolean }[] = [
      ...(hasOccasion ? [{ key: "occasion", label: occasionRead ?? "Thinking about the occasion", done: !loading || !!occasionRead }] : []),
      ...(photo ? [{
        key: "photo", done: !analysisLoading, failed: readFailed,
        label: analysisLoading ? "Looking at the photo" : readFailed ? "The photo didn’t point to a clear theme" : analysis?.read ?? "Looked at the photo",
      }] : []),
      ...cues.map((c) => ({ key: `cue:${c.label}`, label: `Found: ${c.label}`, done: true })),
      {
        key: "search", done: !loading, failed: status === "error",
        label: loading ? "Searching independent makers" : status === "error" ? "Couldn’t reach the catalog" : status === "empty" ? "No in-stock matches yet" : `${products.length} gifts from ${makers} makers`,
      },
    ];
    return (
      <Screen theme="giver">
        <AppHeader right={<Chip>Prototype</Chip>} />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-10" aria-live="polite">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={photo.previewUrl} alt="" className="h-24 w-24 rounded-card border border-giver-border object-cover" />
          )}
          <h1 className="text-center text-[24px] font-bold leading-[30px] tracking-[-0.4px]">{readingDone ? "Got it" : "Finding gifts"}</h1>
          <ol className="flex w-full max-w-[320px] flex-col gap-2.5">
            {rows.map((r, i) => <ReadStep key={r.key} label={r.label} done={r.done} failed={r.failed} delay={i * 180} />)}
          </ol>
          <p className="text-[12px] text-giver-text2">About ten seconds.</p>
        </main>
      </Screen>
    );
  }

  // ---------------- 5 — matches ----------------
  const viewLabel = view === "occasion" ? "the occasion" : view === "photo" ? "the photo" : `the ${view.label}`;
  const sectionTitle = loading ? `Finding gifts for ${viewLabel}…`
    : view === "occasion" ? "Matches the occasion" : view === "photo" ? "Looks like the photo" : `Gifts for the ${view.label}`;
  const budgetOptions = budget === WIDE ? [...BUDGETS, WIDE] : BUDGETS;

  return (
    <Screen theme="giver" fixed>
      <div className="flex shrink-0 items-center gap-3 px-5 pt-[18px] pb-3">
        <BackButton onClick={() => setStep("filters")} />
        <span className="text-[15px] font-[650]">Matches</span>
        <span className="ml-auto"><Chip>Prototype</Chip></span>
      </div>

      <main className="flex min-h-0 flex-1 flex-col px-5">
        {/* Static block: photo, cues, filters, section title. Only the grid below scrolls. */}
        <div className="flex shrink-0 flex-col gap-2.5">
          {fileInput}
          <PhotoInputCard photo={photo} searching={loading && clearedByPhoto} onChange={() => fileRef.current?.click()} />
          {photo && <AnalysisCard analysis={analysis} loading={analysisLoading} hasOccasion={hasOccasion} view={view} onPick={onView} />}
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
          {status !== "empty" && (
            <div className="flex items-baseline justify-between pt-1">
              <h2 className="text-[15px] font-[650] leading-5">{sectionTitle}</h2>
              {status === "ready" && <span className="text-[12px] text-giver-text2">{products.length} gifts · {makers} makers</span>}
            </div>
          )}
        </div>

        {/* Scroll region */}
        <div className="-mx-5 mt-2.5 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-4">
          {status === "empty" ? (
            <EmptyState photo={photo} budget={budget} location={location} occasion={occasion} view={view}
              onTryPhoto={() => fileRef.current?.click()} onWiden={() => onBudget(WIDE)}
              onDescribe={() => { setPhoto(null); setClaude(null); setCatalog(null); setVisual(null); setStep("occasion"); }}
              onOccasion={() => onView("occasion")} />
          ) : status === "error" ? (
            <Card className="p-4 text-center">
              <p className="text-[14px]">Couldn’t reach the catalog.</p>
              <TextLinkButton onClick={() => void search(view, photo, occasion, budget, region, visual)}>Try again</TextLinkButton>
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
        </div>
      </main>

      <footer className="shrink-0 border-t border-giver-border bg-giver-bg px-5 pb-4 pt-3">
        <PrimaryButton disabled={!selected || loading}
          href={selected ? `/pick/${encodeURIComponent(selected.id)}` : undefined}
          onClick={() => {
            // Hand the pick page what it needs without a refetch (it falls back to get_product).
            if (selected) sessionStorage.setItem(`gc:pick:${selected.id}`, JSON.stringify({ product: selected, occasion, location }));
          }}>
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

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="pb-1">
      <h1 className="text-[24px] font-bold leading-[30px] tracking-[-0.4px]">{title}</h1>
      <p className="pt-1 text-[14px] leading-5 text-giver-text2">{body}</p>
    </div>
  );
}

function ReadStep({ label, done, failed, delay = 0 }: { label: string; done: boolean; failed?: boolean; delay?: number }) {
  return (
    <li className="fade-up flex items-center gap-3 rounded-card border border-giver-border bg-surface px-3.5 py-3" style={{ animationDelay: `${delay}ms` }}>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${done ? (failed ? "bg-giver-border text-giver-text2" : "bg-success text-white") : ""}`}>
        {done ? (failed ? "–" : <CheckIcon size={13} />) : <Spinner label="Working" />}
      </span>
      <span className="text-[14px] leading-5">{label}</span>
    </li>
  );
}

function EmptyState({ photo, budget, location, occasion, view, onTryPhoto, onWiden, onDescribe, onOccasion }: {
  photo: Photo | null; budget: Budget; location: ShipLocation; occasion: string; view: View;
  onTryPhoto: () => void; onWiden: () => void; onDescribe: () => void; onOccasion: () => void;
}) {
  const cueLabel = typeof view === "object" ? view.label : null;
  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <div className="flex flex-wrap gap-1.5">
        <Chip>{budget.label}</Chip>
        <Chip>{location.label}</Chip>
        {cueLabel ? <Chip>{cueLabel}</Chip> : occasion && <Chip>{occasion}</Chip>}
      </div>
      <div className="flex flex-col items-center gap-2 px-4 pt-6 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface text-ink"><SearchIcon /></span>
        <h2 className="pt-1 text-[17px] font-[650] leading-[22px]">
          {cueLabel ? `Nothing for the ${cueLabel} in this budget` : view === "photo" ? "Nothing matched this photo" : "Nothing matched"}
        </h2>
        <p className="text-[14px] leading-5 text-giver-text2">
          Photos of objects they own or like work best. Landscapes and people are hard to match to gifts.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        {view !== "occasion" && occasion ? <PrimaryButton onClick={onOccasion}>Back to the occasion</PrimaryButton>
                                        : <PrimaryButton onClick={onTryPhoto}>Try a different photo</PrimaryButton>}
        {budget !== WIDE && <SecondaryButton onClick={onWiden}>Widen budget to {WIDE.label}</SecondaryButton>}
        {photo && <TextLinkButton onClick={onDescribe}>Describe them in words instead</TextLinkButton>}
      </div>
    </div>
  );
}
