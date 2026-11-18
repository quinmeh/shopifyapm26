"use client";
// "My gifts" entry for every giver screen, with how many are still waiting on the recipient.
// Hidden until this giver has at least one gift, so first-time visitors see a clean header.
import Link from "next/link";
import { useEffect, useState } from "react";

// `refreshKey`: change it (e.g. to a gift's status) to recount after a cancel or confirmation.
export function MyGiftsLink({ refreshKey }: { refreshKey?: string } = {}) {
  const [summary, setSummary] = useState<{ total: number; waiting: number } | null>(null);
  useEffect(() => {
    let active = true;
    fetch("/api/gifts/summary", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (active && s && typeof s.total === "number") setSummary(s); })
      .catch(() => {});
    return () => { active = false; };
  }, [refreshKey]);
  if (!summary?.total) return null;
  return (
    <Link href="/gifts" aria-label={`My gifts${summary.waiting ? `, ${summary.waiting} waiting` : ""}`}
      className="press fade-in flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-giver-input bg-surface pl-3 pr-2 text-[13px] font-medium text-ink hover:border-ink">
      My gifts
      <span aria-hidden="true" className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${summary.waiting ? "bg-ink text-white" : "bg-giver-bg text-giver-text2"}`}>
        {summary.waiting || summary.total}
      </span>
    </Link>
  );
}
