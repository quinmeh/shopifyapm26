// Screen 1c · "From the photo" — what the photo adds, as tappable chips that steer the grid.
// "For the occasion" (default) = occasion-led search; "Looks like the photo" = pure visual;
// a cue = that theme blended with the occasion ("seattle skyline" + "home decor").
import type { Cue } from "@/lib/cues";
import { CheckIcon, TextLinkButton } from "./ui";

export type { Cue };
// source: "claude" = read the photo itself (needs ANTHROPIC_API_KEY); "catalog" = themes the visual matches share.
export type AnalysisResult = { read: string | null; cues: Cue[]; source?: "claude" | "catalog"; unavailable?: string };
export type View = "occasion" | "photo" | Cue;

const UNAVAILABLE_COPY: Record<string, string> = {
  thin: "The photo didn’t point to a clear theme, so the occasion leads.",
  error: "Couldn’t read this photo, so the occasion leads.",
};

export function AnalysisCard({ analysis, loading, hasOccasion, view, onPick, onRetry, canLookAlike = true }: {
  analysis: AnalysisResult | null;
  loading: boolean;
  hasOccasion: boolean;
  view: View;
  onPick: (view: View) => void;
  onRetry?: () => void;
  canLookAlike?: boolean; // false when every photo is a "Photo of us" (no look-alike search)
}) {
  const isCue = (c: Cue) => typeof view === "object" && view.label === c.label;
  return (
    <section className="rounded-card border border-giver-border bg-surface p-3.5" aria-busy={loading}>
      <h2 className="text-[14px] font-[650] leading-5">{loading ? "Reading your photos…" : "From your photos"}</h2>

      {loading ? (
        <>
          <div className="shimmer mt-2 h-3 w-5/6 rounded" />
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            {[120, 96, 84].map((w) => <span key={w} className="shimmer h-9 rounded-full" style={{ width: w }} />)}
          </div>
        </>
      ) : (
        <>
          <p className="pt-1 text-[14px] leading-5 text-giver-text2">
            {analysis && analysis.cues.length > 0 ? analysis.read : UNAVAILABLE_COPY[analysis?.unavailable ?? "thin"] ?? UNAVAILABLE_COPY.thin}
            {analysis?.unavailable === "error" && onRetry && <> <TextLinkButton onClick={onRetry} className="!min-h-0">Try again</TextLinkButton></>}
          </p>
          <div className="stagger-children mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Steer the matches">
            {hasOccasion && <CueChip selected={view === "occasion"} onClick={() => onPick("occasion")}>For the occasion</CueChip>}
            {canLookAlike && <CueChip selected={view === "photo"} onClick={() => onPick("photo")}>Looks like the photo</CueChip>}
            {(analysis?.cues ?? []).map((c) => (
              <CueChip key={c.label} selected={isCue(c)} onClick={() => onPick(c)}>{c.label}</CueChip>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function CueChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onClick}
      className={`press flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${selected ? "bg-ink text-white" : "border border-giver-input bg-surface text-ink hover:border-ink"}`}>
      {selected && <span className="pop flex"><CheckIcon size={12} /></span>}
      {children}
    </button>
  );
}
