"use client";
import { useEffect, useRef, useState } from "react";
import type { AddressMatch } from "@/lib/address";

type Props = {
  giftId: string;
  value: string;
  city: string;
  region: string;
  postalCode: string;
  error?: string;
  onChange: (value: string) => void;
  onSelect: (address: AddressMatch) => void;
};

export function AddressSearch({ giftId, value, city, region, postalCode, error, onChange, onSelect }: Props) {
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const lastStarted = useRef(0);
  const selectedValue = useRef<string | null>(null);

  useEffect(() => {
    if (!focused || value.trim().length < 8 || selectedValue.current === value) return;
    const request = new AbortController();
    controller.current = request;
    // Debounce typing and respect the server's one-request-per-second limit.
    const timer = setTimeout(async () => {
      if (request.signal.aborted) return;
      lastStarted.current = Date.now();
      setMatches([]); setActive(-1); setMessage("Finding addresses…");
      const query = [value.trim(), ...(value.includes(",") ? [] : [city, region, postalCode])].filter(Boolean).join(", ");
      try {
        const response = await fetch("/api/address-search", {
          method: "POST", headers: { "content-type": "application/json" }, signal: request.signal,
          body: JSON.stringify({ giftId, query }),
        });
        const result = await response.json();
        if (request.signal.aborted) return;
        if (!response.ok) throw new Error(result.error);
        setMatches(result.matches);
        setMessage(result.matches.length ? "Choose an address to fill in the details." : "No match yet. Include a city or ZIP, or fill in the details below.");
      } catch {
        if (!request.signal.aborted) setMessage("Suggestions are unavailable. You can still enter your address manually.");
      }
    }, Math.max(650, 1100 - (Date.now() - lastStarted.current)));
    return () => { clearTimeout(timer); request.abort(); };
  }, [giftId, value, city, region, postalCode, focused]);

  const dismiss = () => {
    controller.current?.abort();
    setFocused(false); setMatches([]); setActive(-1); setMessage("");
  };
  const select = (match: AddressMatch) => {
    selectedValue.current = match.line1;
    dismiss();
    onSelect(match);
    setMessage("Address filled in. Review the details and add an apartment or unit if needed.");
  };
  const expanded = focused && matches.length > 0;

  return <div className="relative flex flex-col gap-1">
    <label htmlFor="addr-line1" className="text-[13px] font-medium text-gift-text2">Street address</label>
    <input id="addr-line1" value={value} maxLength={200} required autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls="address-matches"
      aria-activedescendant={expanded && active >= 0 ? `address-match-${active}` : undefined}
      aria-invalid={!!error} aria-describedby={`address-search-help${error ? " err-line1" : ""}`}
      className={`h-10 w-full rounded-control border bg-surface px-3 text-[14px] text-gift-text outline-none focus:border-ink ${error ? "border-clay" : "border-gift-input"}`}
      placeholder="Start typing your street address"
      onFocus={() => setFocused(true)} onBlur={dismiss}
      onChange={e => {
        controller.current?.abort(); selectedValue.current = null;
        setFocused(true); setMatches([]); setActive(-1); setMessage(""); onChange(e.target.value);
      }}
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); dismiss(); }
        else if (expanded && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
          e.preventDefault();
          setActive(current => e.key === "ArrowDown" ? (current + 1) % matches.length : (current <= 0 ? matches.length - 1 : current - 1));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (expanded && active >= 0) select(matches[active]);
        }
      }} />
    {error && <p id="err-line1" className="text-[13px] text-clay">{error}</p>}
    <ul id="address-matches" role="listbox" aria-label="Matching addresses" hidden={!expanded}
      className="absolute inset-x-0 top-[64px] z-20 max-h-64 overflow-y-auto rounded-control border border-gift-input bg-surface">
      {matches.map((match, index) => <li id={`address-match-${index}`} key={`${match.line1}:${match.city}:${match.postalCode}`}
        role="option" aria-selected={active === index}
        className={`min-h-11 cursor-pointer border-b border-gift-border px-3 py-2 text-[14px] text-gift-text hover:bg-gift-bg ${active === index ? "bg-gift-bg" : ""}`}
        onMouseDown={e => e.preventDefault()} onClick={() => select(match)}>
        {match.line1}<span className="block text-[12px] text-gift-text2">{match.city}, {match.region} {match.postalCode}</span>
      </li>)}
    </ul>
    <p id="address-search-help" className="text-[12px] text-gift-text2">Suggestions appear as you type. Include a city or ZIP for better matches.</p>
    <p role="status" className="text-[12px] text-gift-text2">{message}</p>
  </div>;
}
