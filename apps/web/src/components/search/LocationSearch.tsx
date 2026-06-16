"use client";

import { useEffect, useRef, useState } from "react";
import { useGeocode } from "@/hooks/useGeocode";
import type { GeocodeResult } from "@/lib/types";

export type ActiveLocation = {
  name: string;
  latitude: number;
  longitude: number;
};

function formatLabel(r: GeocodeResult): string {
  return [r.name, r.admin1, r.country].filter(Boolean).join(", ");
}

export function LocationSearch({
  onSelect,
  bootstrap,
}: {
  onSelect: (loc: ActiveLocation) => void;
  bootstrap: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const bootstrapped = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  const { data: results = [], isFetching } = useGeocode(debounced);

  // Bootstrap from IP location on first mount when nothing selected.
  useEffect(() => {
    if (!bootstrap || bootstrapped.current) {
      return;
    }
    bootstrapped.current = true;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/iplocation");
        if (!res.ok) return;
        const data = (await res.json()) as ActiveLocation;
        if (!cancelled) {
          onSelect(data);
        }
      } catch {
        // default handled server-side; ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, onSelect]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const choose = (r: GeocodeResult) => {
    onSelect({
      name: formatLabel(r),
      latitude: r.latitude,
      longitude: r.longitude,
    });
    setQuery(r.name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[highlight];
      if (r) choose(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && debounced.trim().length >= 2;
  const hasResults = results.length > 0;
  const activeId =
    showDropdown && hasResults ? `search-option-${highlight}` : undefined;

  return (
    <div className="search" ref={containerRef} data-testid="location-search">
      <label htmlFor="city-search" className="visually-hidden">
        Search for a city
      </label>
      <input
        id="city-search"
        data-testid="search-input"
        className="search-input"
        type="search"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="search-listbox"
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        aria-label="Search for a city"
        placeholder="Search city…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <ul
          className="search-dropdown glass"
          id="search-listbox"
          role="listbox"
          aria-label="City search results"
          data-testid="search-listbox"
        >
          {isFetching && !hasResults && (
            <li className="search-option muted">Searching…</li>
          )}
          {!isFetching && !hasResults && (
            <li className="search-option muted">No results</li>
          )}
          {results.map((r, i) => (
            <li
              key={`${r.latitude},${r.longitude},${r.name}`}
              id={`search-option-${i}`}
              className="search-option"
              role="option"
              data-testid="search-option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
            >
              <span className="search-option-name">{r.name}</span>
              <span className="muted">
                {[r.admin1, r.country].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
