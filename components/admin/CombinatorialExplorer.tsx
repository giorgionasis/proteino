"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Combinatorial admin Explorer — pick subcategory × region × every
 * published category filter and see how many items match. Drives the
 * "is this combination dense enough to surface as a Card / Carousel /
 * Collection?" question.
 *
 * Server endpoint: POST /api/admin/explorer/query — see
 * app/api/admin/explorer/query/route.ts for the matching logic; it
 * shares the same `matchesFilter` predicate the public category pages
 * use.
 *
 * Replaces the old FiltersExplorer (subcategory + region counts only,
 * no combination). Same recommendation thresholds (>10 → Card,
 * 4-10 → Carousel, <4 → too few).
 */

interface FilterRow {
  id:         string;
  filter_id:  string;
  label:      string;
  widget:     string;
  placeholder?: string | null;
  options:    { id: string; label: string }[];
  is_published: boolean;
}

interface SubcategoryRow {
  id:        string;
  category?: string;
  name:      string;
}

interface RegionRow {
  id:        string;
  name:      string;
  parent_id: string | null;
}

interface SampleItem {
  id:           string;
  slug:         string;
  title:        string;
  cover_url:    string;
  avg_rating:   number;
  rating_count: number;
  subcategory:  string;
  area?:        string;
}

interface QueryResult {
  total:  number;
  count:  number;
  sample: SampleItem[];
}

const VENUE_CATEGORIES = new Set(["food", "bars", "hotels", "theater", "events"]);

// Free-text filters that don't carry an `options` array. Rendered as a
// text input; admin types a string, server applies ciIncludes.
const FREE_TEXT_FILTERS = new Set(["writer", "publisher", "director", "actor", "performer"]);

// Filters that have no usable explorer surface (complex/legacy). We
// expose them as informational chips but no input.
const SKIPPED_FILTERS = new Set(["awards", "price", "ticket_price", "season", "epoch"]);

function ChipButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full text-[12px] font-medium border transition-colors ${
        active
          ? "bg-zinc-900 text-white border-zinc-900"
          : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

export function CombinatorialExplorer({ category }: { category: string }) {
  const [filters, setFilters]               = useState<FilterRow[]>([]);
  const [subcategories, setSubcategories]   = useState<SubcategoryRow[]>([]);
  const [topLevelRegions, setTopLevelRegions] = useState<RegionRow[]>([]);
  const [selections, setSelections]         = useState<Record<string, string | string[]>>({});
  const [minRating, setMinRating]           = useState<number>(0);

  const [result, setResult]   = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Reset picks when category changes.
  useEffect(() => {
    setSelections({});
    setMinRating(0);
    setResult(null);
  }, [category]);

  // Load filter config + subcategories + (if venue) regions.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`/api/admin/category-filters?category=${encodeURIComponent(category)}`).then((r) => r.json()),
      fetch(`/api/admin/subcategories?category=${encodeURIComponent(category)}`).then((r) => r.json()),
      VENUE_CATEGORIES.has(category)
        ? fetch(`/api/admin/regions?top=true`).then((r) => r.json()).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(([fJson, sJson, rJson]) => {
        if (cancelled) return;
        const fList: FilterRow[] = Array.isArray(fJson)
          ? fJson
          : Array.isArray(fJson?.filters)
            ? fJson.filters
            : [];
        const published = fList.filter((f) => f.is_published);
        setFilters(published);

        const sList: SubcategoryRow[] = Array.isArray(sJson)
          ? sJson.filter((s: any) => s.category === category)
          : [];
        setSubcategories(sList);

        const rList: RegionRow[] = Array.isArray(rJson) ? rJson : [];
        setTopLevelRegions(rList.filter((r) => !r.parent_id));
      })
      .catch((e: any) => { if (!cancelled) setError(e.message ?? String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [category]);

  // Debounced query when selections change.
  useEffect(() => {
    if (loading) return;
    setRunning(true);
    const handle = setTimeout(() => {
      void runQuery();
    }, 250);
    return () => clearTimeout(handle);
    // selections + minRating + category drive the query
  }, [selections, minRating, category, loading]);

  async function runQuery() {
    try {
      const res = await fetch("/api/admin/explorer/query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ category, filters: selections, minRating: minRating || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? `Σφάλμα (${res.status})`);
        setRunning(false);
        return;
      }
      setResult(json as QueryResult);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  function toggleMulti(filterId: string, optionId: string) {
    setSelections((prev) => {
      const cur = prev[filterId];
      const arr = Array.isArray(cur) ? cur : (typeof cur === "string" && cur ? [cur] : []);
      const next = arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId];
      const out = { ...prev };
      if (next.length === 0) delete out[filterId];
      else out[filterId] = next;
      return out;
    });
  }

  function setText(filterId: string, value: string) {
    setSelections((prev) => {
      const out = { ...prev };
      if (!value.trim()) delete out[filterId];
      else out[filterId] = value.trim();
      return out;
    });
  }

  function clearAll() {
    setSelections({});
    setMinRating(0);
  }

  const activeCount =
    Object.keys(selections).length + (minRating > 0 ? 1 : 0);

  if (loading) {
    return <div className="text-sm text-zinc-500">Φόρτωση...</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
      {/* Left — pickers */}
      <div className="space-y-5">
        {/* Subcategory */}
        {subcategories.length > 0 && (
          <PickerBlock label="Subcategory" hint="Διάλεξε ακριβώς μία (το subcategory φίλτρο τρέχει σαν 'genre/type/cuisine' στο matcher).">
            <div className="flex flex-wrap gap-1.5">
              <ChipButton
                active={!selections["genre"] && !selections["type"] && !selections["cuisine"] && !selections["event_type"]}
                onClick={() => {
                  setSelections((prev) => {
                    const out = { ...prev };
                    delete out["genre"];
                    delete out["type"];
                    delete out["cuisine"];
                    delete out["event_type"];
                    return out;
                  });
                }}
              >
                Όλες
              </ChipButton>
              {subcategories.map((s) => {
                // Find which filter_id the matcher uses for this category's subs.
                const subFilterId = pickSubFilterId(category, filters);
                const sel = selections[subFilterId];
                const isActive = Array.isArray(sel) ? sel.includes(s.name) : sel === s.name;
                return (
                  <ChipButton
                    key={s.id}
                    active={isActive}
                    onClick={() => toggleMulti(subFilterId, s.name)}
                  >
                    {s.name}
                  </ChipButton>
                );
              })}
            </div>
          </PickerBlock>
        )}

        {/* Region (venues) */}
        {VENUE_CATEGORIES.has(category) && topLevelRegions.length > 0 && (
          <PickerBlock label="Region" hint="Το server expand-άρει σε όλα τα descendants — π.χ. Αθήνα = κάθε neighbourhood.">
            <div className="flex flex-wrap gap-1.5">
              {topLevelRegions.map((r) => {
                const sel = selections["region"];
                const arr = Array.isArray(sel) ? sel : sel ? [sel] : [];
                const isActive = arr.includes(r.id);
                return (
                  <ChipButton
                    key={r.id}
                    active={isActive}
                    onClick={() => toggleMulti("region", r.id)}
                  >
                    {r.name}
                  </ChipButton>
                );
              })}
            </div>
          </PickerBlock>
        )}

        {/* Min rating */}
        <PickerBlock label="Min rating" hint="Φιλτράρει σε avg_rating ≥ X.">
          <div className="flex flex-wrap gap-1.5">
            {[
              { v: 0,   l: "Όλα" },
              { v: 3.5, l: "≥ 3.5" },
              { v: 4.0, l: "≥ 4.0" },
              { v: 4.5, l: "≥ 4.5" },
            ].map((r) => (
              <ChipButton
                key={r.v}
                active={minRating === r.v}
                onClick={() => setMinRating(r.v)}
              >
                {r.l}
              </ChipButton>
            ))}
          </div>
        </PickerBlock>

        {/* Filter rows */}
        {filters
          .filter((f) => !isSubFilterId(category, f.filter_id))
          .filter((f) => f.filter_id !== "region")
          .map((f) => {
            if (SKIPPED_FILTERS.has(f.filter_id)) {
              return (
                <PickerBlock
                  key={f.id}
                  label={f.label}
                  hint={`Filter "${f.filter_id}" (${f.widget}) — δεν υποστηρίζεται από το Explorer.`}
                  dim
                >
                  <span className="text-xs text-zinc-400 italic">Skipped (complex widget)</span>
                </PickerBlock>
              );
            }

            if (FREE_TEXT_FILTERS.has(f.filter_id) || f.options.length === 0) {
              const currentValue =
                typeof selections[f.filter_id] === "string" ? (selections[f.filter_id] as string) : "";
              return (
                <PickerBlock key={f.id} label={f.label} hint={`Filter "${f.filter_id}" — free text (ciIncludes match).`}>
                  <input
                    type="text"
                    value={currentValue}
                    onChange={(e) => setText(f.filter_id, e.target.value)}
                    placeholder={f.placeholder ?? "Πληκτρολόγησε όνομα..."}
                    className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400"
                  />
                </PickerBlock>
              );
            }

            return (
              <PickerBlock key={f.id} label={f.label} hint={`Filter "${f.filter_id}" — ${f.options.length} options.`}>
                <div className="flex flex-wrap gap-1.5">
                  {f.options.map((opt) => {
                    const sel = selections[f.filter_id];
                    const arr = Array.isArray(sel) ? sel : sel ? [sel] : [];
                    const isActive = arr.includes(opt.id);
                    return (
                      <ChipButton
                        key={opt.id}
                        active={isActive}
                        onClick={() => toggleMulti(f.filter_id, opt.id)}
                      >
                        {opt.label}
                      </ChipButton>
                    );
                  })}
                </div>
              </PickerBlock>
            );
          })}

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-zinc-500 hover:text-zinc-800 underline"
          >
            Καθάρισμα ({activeCount} ενεργών)
          </button>
        )}
      </div>

      {/* Right — results */}
      <div className="sticky top-6 self-start">
        <div className="border border-zinc-200 rounded-xl p-5 bg-white space-y-4">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-zinc-900 tabular-nums">
                {running ? "…" : result?.count ?? 0}
              </span>
              <span className="text-sm text-zinc-500">
                / {result?.total ?? 0} συνολικά
              </span>
            </div>
            <Recommendation count={result?.count ?? 0} />
          </div>

          {/* Save → opens collection editor pointed at this category. */}
          <div className="border-t border-zinc-200 pt-3">
            <Link
              href={`/admin/content/collections/new?source_category=${encodeURIComponent(category)}`}
              className="block text-center px-3 py-2 text-xs font-semibold rounded bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Δημιούργησε Collection για αυτή την κατηγορία →
            </Link>
            <p className="text-[10px] text-zinc-500 mt-1.5 text-center">
              Άνοιγμα editor με preset category. Τα picks του Explorer δεν περνάνε ακόμα.
            </p>
          </div>
        </div>

        {/* Sample grid */}
        {result && result.sample.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">
              Sample (top {result.sample.length} by popularity)
            </p>
            <div className="grid grid-cols-3 gap-2">
              {result.sample.map((it) => (
                <Link
                  key={it.id}
                  href={`/${category}/${it.slug}`}
                  target="_blank"
                  className="block group"
                  title={it.title}
                >
                  <div className="aspect-[2/3] bg-zinc-100 rounded overflow-hidden">
                    {it.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.cover_url}
                        alt={it.title}
                        className="w-full h-full object-cover group-hover:opacity-90"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-300 text-xs">
                        no cover
                      </div>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-700 mt-1 line-clamp-2 leading-tight">
                    {it.title}
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    ★ {it.avg_rating.toFixed(2)} · {it.rating_count}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PickerBlock({
  label,
  hint,
  children,
  dim,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className={dim ? "opacity-60" : undefined}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
        {label}
      </p>
      {children}
      {hint && (
        <p className="text-[10px] text-zinc-400 mt-1">{hint}</p>
      )}
    </div>
  );
}

function Recommendation({ count }: { count: number }) {
  if (count >= 11) {
    return (
      <p className="text-xs text-emerald-700 mt-2">
        ✓ Αρκετά για <strong>Card</strong> (αυτόνομη ενότητα στη σελίδα).
      </p>
    );
  }
  if (count >= 4) {
    return (
      <p className="text-xs text-emerald-700 mt-2">
        ✓ Καλό μέγεθος για <strong>Carousel</strong>.
      </p>
    );
  }
  if (count > 0) {
    return (
      <p className="text-xs text-amber-700 mt-2">
        Πολύ λίγα ({count}) — δεν συνιστάται ως αυτόνομη ενότητα.
      </p>
    );
  }
  return (
    <p className="text-xs text-zinc-500 mt-2">Κανένα match.</p>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */

/** Which filter_id does the matcher use for the subcategory dimension
 *  in this category? Mirrors the switch in lib/category-filters/match. */
function pickSubFilterId(category: string, filters: FilterRow[]): string {
  // Prefer an explicitly published filter with one of the known
  // sub-mapped ids; fall back to a sensible default per category.
  const candidates = ["genre", "event_type", "cuisine", "type"];
  for (const c of candidates) {
    if (filters.some((f) => f.filter_id === c && f.is_published)) return c;
  }
  if (category === "food") return "cuisine";
  if (category === "events") return "event_type";
  if (category === "bars" || category === "hotels" || category === "theater") return "type";
  return "genre";
}

function isSubFilterId(category: string, id: string): boolean {
  return id === pickSubFilterId(category, []) || ["genre", "event_type", "cuisine", "type"].includes(id);
}
