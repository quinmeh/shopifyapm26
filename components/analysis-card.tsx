// Screen 1c · "What her photo says" — Claude's read of the photo plus tappable cue chips.
// Tapping a cue re-searches on that theme; "Everything" restores the pure-visual matches.
import { CheckIcon } from "./ui";

export type Cue = { label: string; query: string };
// source: "claude" = read the photo itself (needs ANTHROPIC_API_KEY); "catalog" = themes the visual matches share.
export type AnalysisResult = { read: string | null; cues: Cue[]; source?: "claude" | "catalog"; unavailable?: string };

const UNAVAILABLE_COPY: Record<string, string> = {
  thin: "The matches were too varied to name a theme. Tap any tile below.",
  error: "Couldn’t read this photo. Matches below still come from the photo.",
};

export function AnalysisCard({
  analysis,
  loading,
  active,
  onPick,
}: {
  analysis: AnalysisResult | null;
  loading: boolean;
  active: Cue | null; // null = everything in the photo
  onPick: (cue: Cue | null) => void;
}) {
  return (
    <section className="rounded-card border border-giver-border bg-surface p-3.5" aria-busy={loading}>
      <h2 className="text-[14px] font-[650] leading-5">
        {loading ? "Reading her photo…" : analysis?.source === "catalog" ? "What the matches point to" : "What her photo says"}
      </h2>

      {loading ? (
        <>
          <div className="mt-2 h-3 w-5/6 rounded bg-skeleton" />
          <div className="mt-1.5 h-3 w-3/5 rounded bg-skeleton" />
          <div className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
            {[72, 96, 84].map((w) => <span key={w} className="h-9 rounded-full bg-skeleton" style={{ width: w }} />)}
          </div>
        </>
      ) : analysis && analysis.cues.length > 0 ? (
        <>
          {analysis.read && <p className="pt-1 text-[14px] leading-5 text-giver-text2">{analysis.read}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Focus the matches on">
            <CueChip selected={active === null} onClick={() => onPick(null)}>Everything in the photo</CueChip>
            {analysis.cues.map((c) => (
              <CueChip key={c.label} selected={active?.label === c.label} onClick={() => onPick(c)}>
                {c.label}
              </CueChip>
            ))}
          </div>
        </>
      ) : (
        <p className="pt-1 text-[13px] leading-[18px] text-giver-text2">
          {UNAVAILABLE_COPY[analysis?.unavailable ?? "thin"] ?? UNAVAILABLE_COPY.thin}
        </p>
      )}
    </section>
  );
}

function CueChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${
        selected ? "bg-ink text-white" : "border border-giver-input bg-surface text-ink"
      }`}
    >
      {selected && <CheckIcon size={12} />}
      {children}
    </button>
  );
}
