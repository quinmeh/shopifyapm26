"use client";
// Giver flow on `/`: guided setup (1 photo → 2 occasion → 3 budget & ships-to) → 4 reading the photo → 5 matches.
// DESIGN.md §4 screens 1, 1·2, 1·3, 1·4, 1c, with states 1a (reloading) and 1b (no matches) on the matches screen.
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductSnapshot } from "@/lib/types";
import { AnalysisCard, type AnalysisResult, type Cue } from "./analysis-card";
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
const GUIDED: Step[] = ["photo", "occasion", "filters"];

export function GiverSearch() {
  const [step, setStep] = useState<Step>("photo");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [occasion, setOccasion] = useState(DEFAULT_OCCASION);
  const [budget, setBudget] = useState<Budget>(BUDGETS[1]);
  const [location, setLocation] = useState<ShipLocation>({ label: "Seattle, WA", region: "WA" });

  // Two cue sources: Claude reads the photo (optional, needs a key); the catalog derives themes from the
  // visual matches (always). Claude wins when it returns cues; otherwise the catalog's show.
  const [claude, setClaude] = useState<AnalysisResult | null>(null);
  const [catalog, setCatalog] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cue, setCue] = useState<Cue | null>(null); // null = everything in the photo
  const analysis: AnalysisResult | null = claude && claude.cues.length > 0 ? claude : catalog ?? (analyzing ? null : claude);
  const setAnalysis = (a: AnalysisResult | null) => { setClaude(a); setCatalog(a); };

  const [products, setProducts] = useState<ProductSnapshot[]>([]);
  const [makers, setMakers] = useState(0);
  const [status, setStatus] = useState<Status>("loading");
  const [selected, setSelected] = useState<ProductSnapshot | null>(null);
  const [clearedByPhoto, setClearedByPhoto] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const searchReq = useRef(0); // stale-response guards
  const analyzeReq = useRef(0);
  const region = location.region ?? "";

  // One search. A cue = text search on that theme; else photo → pure visual; no photo → occasion text.
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
          occasion: occ, cue: c?.query, budget: { min: b.min, max: b.max }, region: reg || undefined,
        }),
      });
      if (id !== searchReq.current) return;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as {
        products: ProductSnapshot[]; makers: number; mode: string; read?: string | null; cues?: Cue[];
      };
      setProducts(json.products);
      setMakers(json.makers);
      setStatus(json.products.length ? "ready" : "empty");
      if (json.mode === "photo") {
        setCatalog(json.cues?.length ? { read: json.read ?? null, cues: json.cues, source: "catalog" } : { read: null, cues: [], unavailable: "thin" });
      }
    } catch {
      if (id === searchReq.current) setStatus("error");
    }
  }, []);

  const analyze = useCallback(async (p: Photo, occ: string) => {
    const id = ++analyzeReq.current;
    setAnalyzing(true);
    setClaude(null);
    setCatalog(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ photo: { contentType: p.contentType, data: p.data }, occasion: occ }),
      });
      if (id !== analyzeReq.current) return;
      const out = res.ok ? ((await res.json()) as AnalysisResult) : { read: null, cues: [], unavailable: "error" };
      setClaude(out.cues.length ? { ...out, source: "claude" } : out);
    } catch {
      if (id === analyzeReq.current) setClaude({ read: null, cues: [], unavailable: "error" });
    } finally {
      if (id === analyzeReq.current) setAnalyzing(false);
    }
  }, []);

  // "Find gifts": photo read + visual search in parallel while the reading screen narrates.
  const findGifts = () => {
    setStep("reading");
    setCue(null);
    setClearedByPhoto(false);
    if (photo) void analyze(photo, occasion);
    else setAnalysis(null);
    void search(photo, null, occasion, budget, region);
  };

  // The photo read is "in progress" until Claude has answered AND the catalog cues are in.
  const analysisLoading = analyzing || (!!photo && !cue && status === "loading" && !(claude && claude.cues.length > 0));
  // Reading screen auto-advances once both the read and the search have settled.
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
              <Heading title="What’s the occasion?" body="Optional. It shapes the note they read first, and the matches if there’s no photo." />
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
              <PrimaryButton onClick={findGifts}>{photo ? "Find gifts from the photo" : "Find gifts"}</PrimaryButton>
              <p className="pt-2 text-center text-[12px] text-giver-text2">Nothing is bought until they confirm.</p>
            </>
          )}
          <CreditFooter />
        </footer>
      </Screen>
    );
  }

  // ---------------- 4 — reading the photo ----------------
  if (step === "reading") {
    const cues = analysis?.cues ?? [];
    const readFailed = !!analysis && cues.length === 0;
    return (
      <Screen theme="giver">
        <AppHeader right={<Chip>Prototype</Chip>} />
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-5 pb-10" aria-live="polite">
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={photo.previewUrl} alt="" className="h-24 w-24 rounded-card border border-giver-border object-cover" />
          )}
          <h1 className="text-center text-[24px] font-bold leading-[30px] tracking-[-0.4px]">
            {photo ? (readingDone ? "Got it" : "Reading the photo") : (readingDone ? "Got it" : "Finding gifts")}
          </h1>
          <ol className="flex w-full max-w-[320px] flex-col gap-2.5">
            {photo && (
              <ReadStep done={!analysisLoading} failed={readFailed}
                label={analysisLoading ? "Looking at the photo" : readFailed ? "Matches were too varied to name a theme" : analysis?.read ?? "Looked at the photo"} />
            )}
            {cues.map((c, i) => (
              <ReadStep key={c.label} done delay={i * 180} label={`Found: ${c.label}`} />
            ))}
            <ReadStep done={!loading} failed={status === "error"} delay={cues.length * 180}
              label={loading ? "Searching independent makers" : status === "error" ? "Couldn’t reach the catalog" : status === "empty" ? "No in-stock matches yet" : `${products.length} gifts from ${makers} makers`} />
          </ol>
          <p className="text-[12px] text-giver-text2">About ten seconds.</p>
        </main>
      </Screen>
    );
  }

  // ---------------- 5 — matches ----------------
  const sectionTitle = loading
    ? cue ? `Finding gifts for the ${cue.label}…` : photo ? `Finding gifts that match the photo…` : "Finding gifts…"
    : cue ? `Gifts for the ${cue.label}` : "Matches their taste";
  const budgetOptions = budget === WIDE ? [...BUDGETS, WIDE] : BUDGETS;

  return (
    <Screen theme="giver">
      <div className="flex items-center gap-3 px-5 pt-[18px] pb-3">
        <BackButton onClick={() => setStep("filters")} />
        <span className="text-[15px] font-[650]">Matches</span>
        <span className="ml-auto"><Chip>Prototype</Chip></span>
      </div>

      <main className="flex flex-1 flex-col gap-2.5 px-5 pb-4">
        {fileInput}
        <PhotoInputCard photo={photo} searching={loading && clearedByPhoto} onChange={() => fileRef.current?.click()} />
        {photo && <AnalysisCard analysis={analysis} loading={analysisLoading} active={cue} onPick={onCue} />}
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

        {status === "empty" ? (
          <EmptyState photo={photo} budget={budget} location={location} occasion={occasion} cue={cue}
            onTryPhoto={() => fileRef.current?.click()} onWiden={() => onBudget(WIDE)}
            onDescribe={() => { setPhoto(null); setAnalysis(null); setCue(null); setStep("occasion"); }}
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
        <PrimaryButton disabled={!selected || loading}
          href={selected ? `/pick/${encodeURIComponent(selected.id)}` : undefined}
          onClick={() => { if (selected) sessionStorage.setItem(`gc:pick:${selected.id}`, JSON.stringify(selected)); }}>
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
          Photos of objects they own or like work best. Landscapes and people are hard to match to gifts.
        </p>
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        {cue ? <PrimaryButton onClick={onEverything}>Back to everything in the photo</PrimaryButton>
             : <PrimaryButton onClick={onTryPhoto}>Try a different photo</PrimaryButton>}
        {budget !== WIDE && <SecondaryButton onClick={onWiden}>Widen budget to {WIDE.label}</SecondaryButton>}
        {photo && <TextLinkButton onClick={onDescribe}>Describe them in words instead</TextLinkButton>}
      </div>
    </div>
  );
}
