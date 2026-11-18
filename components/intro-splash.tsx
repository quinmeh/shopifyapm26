"use client";
// Opening experience before the giver flow: the Twofold bow ties itself.
// Two loops draw out from one knot (two people, one gift), the knot pops, the tails fall,
// then the wordmark and tagline rise and the splash lifts away into step 1.
// Plays once per browser session; tap or "Skip" ends it; reduced motion skips it entirely.
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BRAND } from "./ui";

const SEEN_KEY = "twofold:intro-seen";
const HOLD_MS = 2300; // when the exit starts
const EXIT_MS = 420;

type Phase = "pending" | "playing" | "leaving" | "done";

export function IntroSplash({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>("pending");
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    setPhase((p) => (p === "playing" ? "leaving" : p));
    timers.current.push(window.setTimeout(() => setPhase("done"), EXIT_MS));
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocked: intro may replay */ }
  }, []);

  useEffect(() => {
    const list = timers.current;
    queueMicrotask(() => {
      let seen = false;
      try { seen = sessionStorage.getItem(SEEN_KEY) === "1"; } catch { /* treat as unseen */ }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (seen || reduced) { setPhase("done"); return; }
      setPhase("playing");
      list.push(window.setTimeout(finish, HOLD_MS));
    });
    return () => list.forEach(clearTimeout);
  }, [finish]);

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  if (phase === "done") return <>{children}</>;
  if (phase === "pending") return <div className="min-h-dvh flex-1 bg-giver-bg" aria-hidden="true" />;

  const d = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
  return (
    <div onClick={finish}
      className={`intro fixed inset-0 z-50 flex flex-col items-center justify-center bg-giver-bg px-5 text-center ${phase === "leaving" ? "intro-out" : ""}`}>
      <div className="relative flex flex-col items-center">
        <span aria-hidden="true" className="ring absolute left-1/2 top-0 -ml-14 h-28 w-28 rounded-[30px] bg-giver-border" style={d(900)} />
        <span className="pop relative flex h-28 w-28 items-center justify-center rounded-[30px] bg-ink text-white" style={d(0)}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
            role="img" aria-label={`${BRAND} logo: a bow with two loops and one knot`} className="intro-bow">
            <path className="intro-draw" style={d(280)} pathLength={1} d="M12 11.5C10 8 5.2 5.6 3.6 7.6c-1.5 1.9.6 5.6 8.4 3.9z" />
            <path className="intro-draw" style={d(420)} pathLength={1} d="M12 11.5c2-3.5 6.8-5.9 8.4-3.9 1.5 1.9-.6 5.6-8.4 3.9z" />
            <path className="intro-draw" style={d(980)} pathLength={1} d="M11.2 12.4 8 19.5" />
            <path className="intro-draw" style={d(1040)} pathLength={1} d="M12.8 12.4 16 19.5" />
            <circle className="intro-knot" style={d(900)} cx="12" cy="11.6" r="1.3" fill="currentColor" stroke="none" />
          </svg>
        </span>
        <h1 className="rise font-display pt-6 text-[44px] font-semibold leading-none" style={d(1150)}>{BRAND}</h1>
        <p className="rise pt-3 text-[15px] text-giver-text2" style={d(1320)}>A gift made by two.</p>
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); finish(); }}
        className="fade-in absolute bottom-8 min-h-11 px-4 text-[13px] text-giver-text2 underline underline-offset-[3px]" style={d(600)}>
        Skip
      </button>
    </div>
  );
}
