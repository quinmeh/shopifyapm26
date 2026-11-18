"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Field, PrimaryButton, SecondaryButton, inputCls } from "./ui";

// `pendingEmail`: a verification link was already sent for this gift (from the create step).
export function GiverEmail({ giftId, returnTo = "/gifts", pendingEmail }: { giftId?: string; returnTo?: string; pendingEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(pendingEmail ?? "");
  const [editing, setEditing] = useState(!pendingEmail);
  const [verified, setVerified] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const r = await fetch(giftId ? `/api/gifts/${giftId}` : "/api/auth/session", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (active) setVerified(giftId ? data.ownerEmail ?? null : data.email);
      } catch { /* allow retry when window is focused */ }
    };
    void check(); window.addEventListener("focus", check);
    const timer = setInterval(() => { if (!document.hidden) void check(); }, 5000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", check); };
  }, [giftId]);
  async function send() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, giftId, returnTo: giftId ? `/gift/${giftId}` : returnTo }) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setPreview(result.preview);
      setEditing(false);
      setMessage(result.preview ? "Preview email created locally. No email was sent." : giftId ? `New link sent to ${email.trim()}.` : "Check your inbox for your private tracking link.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Couldn’t send the email."); }
    finally { setBusy(false); }
  }
  return <Card className="flex flex-col gap-2 p-3.5">
    <h2 className="text-[15px] font-semibold">{giftId ? (verified ? "You’ll be notified when they choose" : !editing ? "One tap to turn on notifications" : "Get notified when they choose") : "Access your gifts by email"}</h2>
    {verified ? <><p className="break-all text-[13px] text-success-text">Email verified: {verified}</p><p className="text-[12px] text-giver-text2">We’ll email you when they confirm. <a href="/gifts" className="underline">My gifts</a></p>
      {!giftId && <SecondaryButton onClick={async () => { const r = await fetch("/api/auth/session", { method: "DELETE" }); if (r.ok) { router.push("/giver"); router.refresh(); } }}>Sign out</SecondaryButton>}</> : giftId && !editing ? <>
      <p className="text-[13px] leading-[18px]">We sent a link to <span className="break-all font-semibold">{email}</span>. Tap it to confirm it’s you, and we’ll email you the moment they choose.</p>
      <div className="flex items-center gap-4">
        <button type="button" disabled={busy} onClick={() => void send()} className="min-h-10 text-[13px] underline underline-offset-[3px]">{busy ? "Sending…" : "Resend link"}</button>
        <button type="button" onClick={() => { setEditing(true); setMessage(""); }} className="min-h-10 text-[13px] underline underline-offset-[3px]">Use a different email</button>
      </div>
    </> : <>
      <Field label="Your email" htmlFor={`giver-email-${giftId ?? "account"}`}><input id={`giver-email-${giftId ?? "account"}`} className={inputCls} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <p className="text-[12px] text-giver-text2">{giftId ? "Your gift is saved and you can track it in this browser. Add and verify an email for updates and access on other devices." : "Use your verified email to recover your gifts. No password needed."}</p>
      <PrimaryButton disabled={busy || !email.trim()} onClick={() => void send()}>{busy ? "Sending…" : "Email me a verification link"}</PrimaryButton>
    </>}
    {message && <p role="status" className="text-[13px] text-giver-text2">{message}</p>}
    {giftId && !verified && editing && <p className="text-[12px] text-giver-text2">You can skip this. Keep this browser’s cookies to retain private access.</p>}
    {preview && <a className="text-[13px] underline" href="/dev/mail" target="_blank" rel="noopener noreferrer">Open local email preview</a>}
  </Card>;
}
