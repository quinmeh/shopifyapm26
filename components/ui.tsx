// Shared primitives from DESIGN.md §3. Tailwind only; no component library.
import Link from "next/link";
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export const BRAND = "Twofold";

// Animation delay for staggered entrances: <div className="rise" style={stagger(2)}>.
export function stagger(i: number, step = 70, base = 0): CSSProperties {
  return { "--d": `${base + i * step}ms` } as CSSProperties;
}

// ---- Icons (inline stroke SVG, DESIGN §3) ----
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function GiftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7c-2.5 0-4.5-1.5-4.5-3.2S9 1.5 10 2.2c1.3.9 2 4.8 2 4.8zM12 7c2.5 0 4.5-1.5 4.5-3.2S15 1.5 14 2.2c-1.3.9-2 4.8-2 4.8z" />
    </svg>
  );
}
// The Twofold mark: one ribbon, two loops, one knot. Two people tied to one gift.
export function BowMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={1.9} aria-hidden="true">
      <path d="M12 11.5C10 8 5.2 5.6 3.6 7.6c-1.5 1.9.6 5.6 8.4 3.9z" />
      <path d="M12 11.5c2-3.5 6.8-5.9 8.4-3.9 1.5 1.9-.6 5.6-8.4 3.9z" />
      <path d="M11.2 12.4 8 19.5M12.8 12.4 16 19.5" />
      <circle cx="12" cy="11.6" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  );
}
// A check that draws itself in. `delay` in ms.
export function DrawnCheck({ size = 14, delay = 0, strokeWidth = 2.5 }: { size?: number; delay?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={strokeWidth} aria-hidden="true" className="draw" style={{ "--d": `${delay}ms` } as CSSProperties}>
      <path d="M5 12l5 5L20 7" pathLength={1} />
    </svg>
  );
}
// Paper confetti in the gift palette. Purely decorative and hidden for reduced motion.
const CONFETTI = ["var(--color-clay)", "var(--color-ink)", "var(--color-clay-tint)", "var(--color-gift-input)", "#E7B49A"];
export function Confetti({ pieces = 18, spread = 150, delay = 0 }: { pieces?: number; spread?: number; delay?: number }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
      {Array.from({ length: pieces }, (_, i) => {
        const angle = (i / pieces) * Math.PI * 2 + (i % 3) * 0.35;
        const dist = spread * (0.6 + ((i * 37) % 10) / 25);
        const style = {
          "--x": `${Math.round(Math.cos(angle) * dist)}px`,
          "--y": `${Math.round(Math.sin(angle) * dist * 0.8 + 30)}px`,
          "--r": `${(i % 2 ? 1 : -1) * (180 + ((i * 53) % 180))}deg`,
          "--d": `${delay + (i % 4) * 30}ms`,
          background: CONFETTI[i % CONFETTI.length],
          width: i % 3 === 0 ? 6 : 8,
          height: i % 3 === 0 ? 10 : 5,
        } as CSSProperties;
        return <span key={i} className="burst absolute -ml-1 -mt-1 rounded-[1.5px] opacity-0" style={style} />;
      })}
    </span>
  );
}
export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.5} aria-hidden="true">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
export function SearchIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
export function ChevronLeftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
export function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} strokeWidth={2.2} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function MessageIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" />
    </svg>
  );
}
export function MailIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}
export function InstagramIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" />
    </svg>
  );
}
export function ShareIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.6M8.2 13.2l7.6 4.6" />
    </svg>
  );
}
export function Spinner({ label = "Searching" }: { label?: string }) {
  return (
    <span role="img" aria-label={label} className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-giver-input border-t-ink" />
  );
}

// ---- Layout ----
// `fixed`: lock the screen to the viewport height so one inner region can own the scrolling.
export function Screen({ children, theme = "giver", fixed }: { children: ReactNode; theme?: "giver" | "gift"; fixed?: boolean }) {
  return (
    // Fixed mode must not be flex-1: inside an indefinite-height body, flex-basis 0% sizes to
    // content and overrides h-dvh, so the window scrolls. flex-none + a hard height pins it.
    <div data-theme={theme} className={`flex flex-col bg-giver-bg data-[theme=gift]:bg-gift-bg ${fixed ? "h-dvh max-h-dvh flex-none overflow-hidden" : "min-h-dvh flex-1"}`}>
      <div className="mx-auto flex w-full min-h-0 max-w-[480px] flex-1 flex-col">{children}</div>
    </div>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-control bg-ink text-white">
        <BowMark size={17} />
      </span>
      <span className="font-display text-[19px] font-semibold leading-none">{BRAND}</span>
    </div>
  );
}

export function AppHeader({ right, inline }: { right?: ReactNode; inline?: boolean }) {
  const brand = <Brand />;
  if (inline) return <a href="/gifts" aria-label={`${BRAND} — my gifts`}>{brand}</a>;
  return (
    <header className="flex items-center justify-between px-5 pt-[18px] pb-3">
      {brand}
      {right}
    </header>
  );
}

// Guided-flow position: filled dot = current, ink dots = done, grey = upcoming.
export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <span className="flex items-center gap-1.5" role="img" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`h-2 rounded-full transition-all duration-300 ease-out ${i === current ? "w-5 bg-ink" : i < current ? "w-2 bg-ink" : "w-2 bg-giver-input"}`} />
      ))}
    </span>
  );
}

export function BackButton({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls = "press flex h-9 w-9 items-center justify-center rounded-control border border-giver-input bg-surface text-ink hover:border-ink";
  if (href) return <Link href={href} aria-label="Back" className={cls}><ChevronLeftIcon /></Link>;
  return <button type="button" aria-label="Back" onClick={onClick} className={cls}><ChevronLeftIcon /></button>;
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-giver-border bg-surface px-2.5 py-1 text-[12px] font-medium text-giver-text2">
      {children}
    </span>
  );
}

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`rounded-card border border-giver-border bg-surface ${className}`} style={style}>{children}</div>;
}

export function CreditFooter() {
  return <p className="pt-2 text-center text-[11px] text-giver-text2">Built on Shopify Catalog + UCP</p>;
}

// ---- Buttons ----
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; children: ReactNode };

const primaryCls =
  "press flex h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink-hover disabled:bg-disabled-bg disabled:text-giver-text2";
const secondaryCls =
  "press flex h-11 w-full items-center justify-center rounded-control border border-giver-input bg-surface px-4 text-[14px] font-medium text-ink hover:border-ink disabled:opacity-60";

export function PrimaryButton({ href, children, className = "", ...rest }: BtnProps) {
  if (href && !rest.disabled) {
    return (
      <Link href={href} className={`${primaryCls} ${className}`} onClick={rest.onClick as never}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={`${primaryCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <button type="button" className={`${secondaryCls} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function TextLinkButton({ children, className = "", ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`min-h-10 text-[13px] text-ink underline underline-offset-[3px] ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---- Inputs (40px, visible label) ----
export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-giver-text2">
        {label}
      </label>
      {children}
    </div>
  );
}
export const inputCls =
  "h-10 w-full rounded-control border border-giver-input bg-surface px-3 text-[14px] text-ink outline-none transition-colors focus:border-ink focus:ring-1 focus:ring-ink";
