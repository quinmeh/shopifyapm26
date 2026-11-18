"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon, inputCls } from "./ui";

export type ShipLocation = { label: string; region?: string };

export const LOCATIONS: ShipLocation[] = [
  { label: "Seattle, WA", region: "WA" },
  { label: "Portland, OR", region: "OR" },
  { label: "Austin, TX", region: "TX" },
  { label: "New York, NY", region: "NY" },
  { label: "Anywhere in the US" },
];

export function LocationPicker({
  value,
  onChange,
}: {
  value: ShipLocation;
  onChange: (location: ShipLocation) => void;
}) {
  const [query, setQuery] = useState(value.label);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const options = LOCATIONS.filter((location) =>
    location.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const choose = (location: ShipLocation) => {
    setQuery(location.label);
    setOpen(false);
    onChange(location);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <input
          id="ships"
          className={`${inputCls} pl-9`}
          value={query}
          role="combobox"
          aria-label="Ships to"
          aria-autocomplete="list"
          aria-controls="ship-location-options"
          aria-expanded={open}
          onFocus={() => setOpen(true)}
          onBlur={() => setQuery(value.label)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && options[0]) {
              event.preventDefault();
              choose(options[0]);
            }
            if (event.key === "Escape") setOpen(false);
          }}
          placeholder="Search a city or ZIP code"
        />
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-giver-text2">
          <SearchIcon size={16} />
        </span>
      </div>
      {open && (
        <div
          id="ship-location-options"
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-control border border-giver-input bg-surface"
        >
          {options.length ? (
            options.map((location) => (
              <button
                key={location.label}
                type="button"
                role="option"
                aria-selected={location.label === value.label}
                className="flex min-h-11 w-full items-center px-3 text-left text-[14px] text-ink hover:bg-giver-bg"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(location)}
              >
                {location.label}
              </button>
            ))
          ) : (
            <p className="px-3 py-3 text-[13px] text-giver-text2">Choose a suggested location.</p>
          )}
        </div>
      )}
    </div>
  );
}
