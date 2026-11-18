"use client";
// "Ships to": the giver types a city or state and picks from the dropdown. Nothing is
// preselected. The catalog's ships_to filter works by US state, so every option carries one.
import { useEffect, useRef, useState } from "react";
import { SearchIcon, inputCls } from "./ui";

export type ShipLocation = { label: string; region?: string };
export const NO_LOCATION: ShipLocation = { label: "" };
export const hasLocation = (l: ShipLocation) => l.label.trim().length > 0;

const STATES: [string, string][] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"],
  ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"], ["NM", "New Mexico"],
  ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
];
const CITIES =
  `New York,NY;Los Angeles,CA;Chicago,IL;Houston,TX;Phoenix,AZ;Philadelphia,PA;San Antonio,TX;San Diego,CA;Dallas,TX;
  Austin,TX;San Jose,CA;Jacksonville,FL;Fort Worth,TX;Columbus,OH;Charlotte,NC;Indianapolis,IN;San Francisco,CA;
  Seattle,WA;Denver,CO;Washington,DC;Nashville,TN;Oklahoma City,OK;Boston,MA;El Paso,TX;Portland,OR;Las Vegas,NV;
  Detroit,MI;Memphis,TN;Louisville,KY;Baltimore,MD;Milwaukee,WI;Albuquerque,NM;Tucson,AZ;Fresno,CA;Sacramento,CA;
  Kansas City,MO;Atlanta,GA;Omaha,NE;Raleigh,NC;Miami,FL;Minneapolis,MN;Tampa,FL;New Orleans,LA;Cleveland,OH;
  Honolulu,HI;Pittsburgh,PA;Cincinnati,OH;St. Louis,MO;Orlando,FL;Salt Lake City,UT;Boise,ID;Richmond,VA;
  Madison,WI;Spokane,WA;Tacoma,WA;Bellevue,WA;Oakland,CA;Brooklyn,NY;Anchorage,AK;Burlington,VT;Providence,RI;
  Hartford,CT;Newark,NJ;Charleston,SC;Savannah,GA;Asheville,NC;Ann Arbor,MI;Boulder,CO;Santa Fe,NM`
    .split(";").map((s) => s.trim()).filter(Boolean).map((s) => s.split(",") as [string, string]);

const ANYWHERE: ShipLocation = { label: "Anywhere in the US" };
const OPTIONS: (ShipLocation & { search: string })[] = [
  ...CITIES.map(([city, st]) => ({ label: `${city}, ${st}`, region: st, search: `${city} ${st} ${STATES.find(([c]) => c === st)?.[1] ?? ""}`.toLowerCase() })),
  ...STATES.map(([st, name]) => ({ label: name, region: st, search: `${name} ${st}`.toLowerCase() })),
  { ...ANYWHERE, search: "anywhere us usa united states america nationwide" },
];

// Best matches first: label starts with the query, then any word starts with it, then contains it.
function matches(query: string): ShipLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const score = (o: (typeof OPTIONS)[number]) => {
    const label = o.label.toLowerCase();
    if (label.startsWith(q) || o.region?.toLowerCase() === q) return 0;
    if (o.search.split(/\s+/).some((w) => w.startsWith(q))) return 1;
    return o.search.includes(q) ? 2 : 3;
  };
  return OPTIONS.map((o) => ({ o, s: score(o) })).filter((x) => x.s < 3).sort((a, b) => a.s - b.s).slice(0, 8).map((x) => ({ label: x.o.label, region: x.o.region }));
}

export function LocationPicker({
  value,
  onChange,
  inputId = "ships",
}: {
  value: ShipLocation;
  onChange: (location: ShipLocation) => void;
  inputId?: string;
}) {
  const [query, setQuery] = useState(value.label);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const options = matches(query);

  const choose = (location: ShipLocation) => {
    setQuery(location.label);
    setOpen(false);
    onChange(location);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id={inputId}
          className={`${inputCls} pl-9`}
          value={query}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={`${inputId}-options`}
          aria-expanded={open && query.trim().length > 0}
          aria-activedescendant={open && options[active] ? `${inputId}-opt-${active}` : undefined}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onBlur={() => setQuery(value.label)} // typed text that wasn't picked doesn't count
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
            if (event.key === "Enter" && open && options[active]) { event.preventDefault(); choose(options[active]); }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Type a city or state"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-giver-text2">
          <SearchIcon size={16} />
        </span>
      </div>
      {open && query.trim().length > 0 && (
        <div
          id={`${inputId}-options`}
          role="listbox"
          className="fade-in absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-control border border-giver-input bg-surface [animation-duration:150ms]"
        >
          {options.length ? (
            options.map((location, i) => (
              <button
                key={location.label}
                id={`${inputId}-opt-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                className={`flex min-h-11 w-full items-center px-3 text-left text-[14px] text-ink ${i === active ? "bg-giver-bg" : "hover:bg-giver-bg"}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(location)}
              >
                <span className="flex-1">{location.label}</span>
                {location.region && !location.label.includes(",") && <span className="text-[12px] text-giver-text2">Anywhere in the state</span>}
              </button>
            ))
          ) : (
            <div className="flex flex-col">
              <p className="px-3 pt-3 text-[13px] text-giver-text2">No match. Try the state name, or:</p>
              <button type="button" role="option" aria-selected={false} className="flex min-h-11 w-full items-center px-3 text-left text-[14px] text-ink hover:bg-giver-bg"
                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(ANYWHERE)}>
                {ANYWHERE.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
