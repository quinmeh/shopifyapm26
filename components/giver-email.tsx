"use client";
import { useEffect, useState } from "react";
import { Card, Field, PrimaryButton, SecondaryButton, inputCls } from "./ui";

export function GiverEmail({ onVerified, returnTo = "/gifts" }: { onVerified?: (email: string | null) => void; returnTo?: string }) {
  const [email, setEmail] = useState("");
  const [verified, setVerified] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const r = await fetch("/api/auth/session", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        if (active) { setVerified(data.email); onVerified?.(data.email); }
      } catch { /* allow retry when window is focused */ }
    };
    void check(); window.addEventListener("focus", check);
    const timer = setInterval(() => { if (!document.hidden) void check(); }, 5000);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", check); };
  }, [onVerified]);
  async function send() {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/auth/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, returnTo }) });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error);
      setPreview(result.preview);
      setMessage(result.preview ? "Preview email created locally. No email was sent." : "Check your inbox. Open the link to verify, then return to this tab to finish your gift.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Couldn’t send the email."); }
    finally { setBusy(false); }
  }
  return <Card className="flex flex-col gap-2 p-3.5">
    <h2 className="text-[15px] font-semibold">Where should we notify you when they choose?</h2>
    {verified ? <><p className="break-all text-[13px] text-success-text">Email verified: {verified}</p><p className="text-[12px] text-giver-text2">We’ll email you when they confirm. <a href="/gifts" className="underline">My gifts</a></p>
      <SecondaryButton onClick={async () => { const r = await fetch("/api/auth/session", { method: "DELETE" }); if (r.ok) { setVerified(null); onVerified?.(null); } }}>Use a different email</SecondaryButton></> : <>
      <Field label="Your email" htmlFor="giver-email"><input id="giver-email" className={inputCls} type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></Field>
      <p className="text-[12px] text-giver-text2">Verify your email to save and privately track your gifts. No password needed.</p>
      <PrimaryButton disabled={busy || !email.trim()} onClick={() => void send()}>{busy ? "Sending…" : "Email me a verification link"}</PrimaryButton>
    </>}
    {message && <p role="status" className="text-[13px] text-giver-text2">{message}</p>}
    {preview && <a className="text-[13px] underline" href="/dev/mail" target="_blank" rel="noopener noreferrer">Open local email preview</a>}
  </Card>;
}
