"use client";
// One row on My gifts: opens the gift's status page, with a two-step Delete.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { GiftStatus } from "@/lib/types";
import { Card, PrimaryButton, SecondaryButton } from "./ui";

const STATUS: Record<GiftStatus, string> = {
  sent: "Waiting for their choice",
  confirmed: "Ready to finish sending",
  completed: "Merchant checkout opened",
  cancelled: "Cancelled",
};

export function GiftListItem({ id, recipientLabel, title, imageUrl, status }: {
  id: string; recipientLabel: string; title: string; imageUrl?: string; status: GiftStatus;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [gone, setGone] = useState(false);
  const linkLive = status === "sent" || status === "confirmed";

  async function remove() {
    setBusy(true); setError("");
    try {
      const r = await fetch(`/api/gifts/${id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Couldn’t delete the gift.");
      setGone(true);
      router.refresh(); // keeps the header count and list in step with the server
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t delete the gift."); setBusy(false); }
  }

  if (gone) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <a href={`/gift/${id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-control bg-skeleton">
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- merchant CDN
              <img src={imageUrl} alt="" className="img-reveal h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">For {recipientLabel}</span>
            <span className="block truncate text-[13px]">{title}</span>
            <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[12px] font-medium ${status === "sent" || status === "cancelled" ? "bg-giver-bg text-giver-text2" : "bg-success-tint text-success-text"}`}>{STATUS[status]}</span>
          </span>
        </a>
        {!confirming && (
          <button type="button" onClick={() => setConfirming(true)} aria-label={`Delete the gift for ${recipientLabel}`}
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-giver-border bg-surface text-giver-text2 hover:border-ink hover:text-ink">
            <TrashIcon />
          </button>
        )}
      </div>
      {confirming && (
        <div className="fade-up flex flex-col gap-2.5 border-t border-warning-border bg-warning-bg p-3">
          <p className="text-[13px] leading-[18px]">
            <span className="font-semibold">Delete this gift?</span>{" "}
            {linkLive ? `The link for ${recipientLabel} will stop working. ` : ""}It’s removed from My gifts on every device, along with any photo. This can’t be undone.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton onClick={() => setConfirming(false)} disabled={busy}>Keep it</SecondaryButton>
            <PrimaryButton onClick={() => void remove()} disabled={busy}>{busy ? "Deleting…" : "Delete"}</PrimaryButton>
          </div>
          {error && <p role="alert" className="text-[13px]">{error}</p>}
        </div>
      )}
    </Card>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}
