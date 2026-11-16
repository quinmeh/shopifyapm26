// Shared primitives from DESIGN.md §3. Tailwind only; no component library.
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// ---- Icons (inline stroke SVG, DESIGN §3) ----
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function GiftIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...stroke} aria-hidden="true">
      <path d="M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7c-2.5 0-4.5-1.5-4.5-3.2S9 1.5 10 2.2c1.3.9 2 4.8 2 4.8zM12 7c2.5 0 4.5-1.5 4.5-3.2S15 1.5 14 2.2c-1.3.9-2 4.8-2 4.8z" />
    </svg>
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
export function Spinner({ label = "Searching" }: { label?: string }) {
  return (
    <span role="img" aria-label={label} className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-giver-input border-t-ink" />
  );
}

// ---- Layout ----
export function Screen({ children, theme = "giver" }: { children: ReactNode; theme?: "giver" | "gift" }) {
  return (
    <div data-theme={theme} className="flex min-h-dvh flex-1 flex-col bg-giver-bg data-[theme=gift]:bg-gift-bg">
      <div className="mx-auto flex w-full max-w-[480px] flex-1 flex-col">{children}</div>
    </div>
  );
}

export function AppHeader({ right, inline }: { right?: ReactNode; inline?: boolean }) {
  const brand = (
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-control bg-ink text-white">
        <GiftIcon size={15} />
      </span>
      <span className="text-[15px] font-[650]">Gift Confirm</span>
    </div>
  );
  if (inline) return brand; // for rows that supply their own padding/right side
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
        <span key={i} className={`h-2 rounded-full ${i === current ? "w-5 bg-ink" : i < current ? "w-2 bg-ink" : "w-2 bg-giver-input"}`} />
      ))}
    </span>
  );
}

export function BackButton({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls = "flex h-9 w-9 items-center justify-center rounded-control border border-giver-input bg-surface text-ink";
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

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-card border border-giver-border bg-surface ${className}`}>{children}</div>;
}

export function CreditFooter() {
  return <p className="pt-2 text-center text-[11px] text-giver-text2">Built on Shopify Catalog + UCP</p>;
}

// ---- Buttons ----
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { href?: string; children: ReactNode };

const primaryCls =
  "flex h-12 w-full items-center justify-center gap-2 rounded-control bg-ink px-4 text-[15px] font-semibold text-white hover:bg-ink-hover disabled:bg-disabled-bg disabled:text-giver-text2";
const secondaryCls =
  "flex h-11 w-full items-center justify-center rounded-control border border-giver-input bg-surface px-4 text-[14px] font-medium text-ink";

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
  "h-10 w-full rounded-control border border-giver-input bg-surface px-3 text-[14px] text-ink outline-none focus:border-ink";
