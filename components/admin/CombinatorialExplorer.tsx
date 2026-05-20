"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ADMIN_FACETS,
  HOTEL_AMENITY_CHOICES,
  type AdminFacet,
} from "@/lib/category-filters/admin-facets";
import type { CategorySlug } from "@/types";

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
  total:           number;
  count:           number;
  sample:          SampleItem[];
  distincts:       Record<string, string[]>;
  /** Distinct values for FREE_TEXT public filters (director / actor /
   *  performer / writer / publisher) extracted from the candidate
   *  rows. Keyed by public filter_id. Used to power the searchable
   *  picker that replaces the old blind-typing text input. */
  peopleDistincts: Record<string, string[]>;
  matchedIds:      string[];
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
  const [adminSelections, setAdminSelections] = useState<Record<string, string | string[]>>({});
  const [minRating, setMinRating]           = useState<number>(0);

  const [result, setResult]   = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const adminFacets: AdminFacet[] = ADMIN_FACETS[category as CategorySlug] ?? [];

  // Reset picks when category changes.
  useEffect(() => {
    setSelections({});
    setAdminSelections({});
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
    // selections + adminSelections + minRating + category drive the query
  }, [selections, adminSelections, minRating, category, loading]);

  async function runQuery() {
    try {
      const res = await fetch("/api/admin/explorer/query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          category,
          filters: selections,
          adminFacets: adminSelections,
          minRating: minRating || null,
        }),
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

  function toggleAdminMulti(facetId: string, optionId: string) {
    setAdminSelections((prev) => {
      const cur = prev[facetId];
      const arr = Array.isArray(cur) ? cur : (typeof cur === "string" && cur ? [cur] : []);
      const next = arr.includes(optionId) ? arr.filter((x) => x !== optionId) : [...arr, optionId];
      const out = { ...prev };
      if (next.length === 0) delete out[facetId];
      else out[facetId] = next;
      return out;
    });
  }

  function setAdminText(facetId: string, value: string) {
    setAdminSelections((prev) => {
      const out = { ...prev };
      if (!value.trim()) delete out[facetId];
      else out[facetId] = value.trim();
      return out;
    });
  }

  function clearAll() {
    setSelections({});
    setAdminSelections({});
    setMinRating(0);
  }

  const activeCount =
    Object.keys(selections).length +
    Object.keys(adminSelections).length +
    (minRating > 0 ? 1 : 0);

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
              const people = result?.peopleDistincts?.[f.filter_id];
              // Searchable picker when the server returned distincts
              // for this people field. Free-text fallback only when
              // there's no usable autocomplete data.
              if (people && people.length > 0) {
                const sel = selections[f.filter_id];
                const arr = Array.isArray(sel) ? sel : sel ? [sel] : [];
                return (
                  <PickerBlock
                    key={f.id}
                    label={f.label}
                    hint={`${people.length} distinct στο dataset. Πολλαπλή επιλογή = OR.`}
                  >
                    <SearchableChips
                      options={people}
                      selected={arr}
                      onToggle={(opt) => toggleMulti(f.filter_id, opt)}
                      placeholder={f.placeholder ?? "Αναζήτηση..."}
                    />
                  </PickerBlock>
                );
              }
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

        {/* Admin-only facets — surfaces columns from the extension
            tables that don't have a public `category_filters` row.
            Distinct option values for `chips` come from the server
            payload (`result.distincts`) so the picker auto-adapts to
            whatever's actually in the DB. */}
        {adminFacets.length > 0 && (
          <div className="border-t border-zinc-100 pt-4 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-coral-700">
                Admin-only facets
              </p>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Columns από τα extension tables που δεν είναι published ως category_filters.
              </p>
            </div>

            {adminFacets.map((f) => (
              <AdminFacetPicker
                key={f.id}
                facet={f}
                value={adminSelections[f.id]}
                distinct={result?.distincts?.[f.id] ?? []}
                onToggle={(opt) => toggleAdminMulti(f.id, opt)}
                onSetText={(v) => setAdminText(f.id, v)}
              />
            ))}
          </div>
        )}

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

          {/* Save → opens collection editor with picked filters carried
              over as a partial CollectionFormData (source_category +
              tags + ext filters + title hint). Range / decade /
              facilities picks can't be expressed as ExtFilter and are
              skipped — the banner inside the editor tells the admin
              which ones didn't carry. */}
          <div className="border-t border-zinc-200 pt-3">
            <Link
              href={buildCollectionDeeplink(
                category,
                selections,
                adminSelections,
                result?.count ?? 0,
                adminFacets,
              )}
              className="block text-center px-3 py-2 text-xs font-semibold rounded bg-zinc-900 text-white hover:bg-zinc-800"
            >
              Δημιούργησε Collection με αυτά τα picks →
            </Link>
            <p className="text-[10px] text-zinc-500 mt-1.5 text-center">
              Τα chip picks (genre/type/platform/country/…) μεταφέρονται· τα range/decade/facilities δεν.
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

/** Translate Explorer picks into a CollectionEditor deeplink with a
 *  pre-populated `initial` partial. The semantics:
 *
 *  - Sub-category picks (genre / type / cuisine / event_type) carry as
 *    `tags[]` — items are tag-filtered server-side by the collection
 *    preview endpoint.
 *  - Public-filter picks with a clean ext-column target (platform →
 *    channel, writer, publisher → publication, director, level,
 *    property_type → type, origin) carry as `ExtFilter[]`.
 *  - Picks without a single-string ExtFilter equivalent (region IDs,
 *    duration buckets, awards picker, characteristics checkboxes,
 *    diet multi-flags, when segments, hotel price band, delivery,
 *    actor/performer jsonb) are skipped — listed in the banner so the
 *    admin knows to re-add manually if needed.
 *  - Admin facets: `chips` and `text` kinds carry directly. `range`,
 *    `year-range`, and `amenities` don't fit `{field, value}` and are
 *    skipped. */
function buildCollectionDeeplink(
  category: string,
  selections: Record<string, string | string[]>,
  adminSelections: Record<string, string | string[]>,
  matchCount: number,
  facets: AdminFacet[],
): string {
  const SUB_FILTER_IDS = new Set(["genre", "type", "cuisine", "event_type"]);
  const PUBLIC_TO_EXT: Record<string, string> = {
    platform:      "channel",
    writer:        "writer",
    publisher:     "publication",
    director:      "director",
    level:         "level",
    property_type: "type",
    origin:        "origin",
  };
  const PUBLIC_SKIP = new Set([
    "region", "duration", "awards", "characteristics", "diet",
    "when", "price", "delivery", "actor", "performer",
  ]);

  const tags: string[] = [];
  const ext: { field: string; value: string }[] = [];

  for (const [fid, v] of Object.entries(selections)) {
    if (SUB_FILTER_IDS.has(fid)) {
      const arr = Array.isArray(v) ? v : v ? [v] : [];
      for (const x of arr) if (typeof x === "string" && x) tags.push(x);
      continue;
    }
    if (PUBLIC_SKIP.has(fid)) continue;
    const target = PUBLIC_TO_EXT[fid];
    if (!target) continue;
    const arr = Array.isArray(v) ? v : v ? [v] : [];
    for (const x of arr) {
      if (typeof x === "string" && x) ext.push({ field: target, value: x });
    }
  }

  for (const f of facets) {
    const sel = adminSelections[f.id];
    if (sel === undefined) continue;
    if (f.kind === "chips" || f.kind === "searchable-chips") {
      const arr = Array.isArray(sel) ? sel : [sel];
      for (const x of arr) {
        if (typeof x === "string" && x) ext.push({ field: f.field, value: x });
      }
    } else if (f.kind === "text") {
      const v = typeof sel === "string" ? sel : Array.isArray(sel) ? sel[0] : "";
      if (v) ext.push({ field: f.field, value: v });
    }
    // range / year-range / amenities / tag-pattern → cannot express as
    // a single {field, value} pair, skip. The banner inside
    // CollectionEditor lists what didn't carry.
  }

  const params = new URLSearchParams();
  params.set("source_category", category);
  if (tags.length > 0) params.set("tags", JSON.stringify(tags));
  if (ext.length > 0) params.set("filters", JSON.stringify(ext));

  // Title hint — admin can edit. Just enough to identify the collection.
  const titleBits = [...tags.slice(0, 2), ...ext.slice(0, 2).map((e) => e.value)];
  if (titleBits.length > 0) {
    params.set("title_specific", titleBits.join(" · "));
  }
  params.set("from_explorer", String(matchCount));
  return `/admin/content/collections/new?${params.toString()}`;
}

/** Render one admin-only facet picker. Dispatches on facet.kind. */
function AdminFacetPicker({
  facet,
  value,
  distinct,
  onToggle,
  onSetText,
}: {
  facet:    AdminFacet;
  value:    string | string[] | undefined;
  distinct: string[];
  onToggle: (opt: string) => void;
  onSetText: (v: string) => void;
}) {
  const arr = Array.isArray(value) ? value : value ? [value] : [];

  if (facet.kind === "text") {
    const current = typeof value === "string" ? value : "";
    return (
      <PickerBlock label={facet.label} hint={facet.hint ?? "Free-text ciIncludes match."}>
        <input
          type="text"
          value={current}
          onChange={(e) => onSetText(e.target.value)}
          placeholder="πχ όνομα..."
          className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400"
        />
      </PickerBlock>
    );
  }

  if (facet.kind === "chips") {
    if (distinct.length === 0) {
      return (
        <PickerBlock label={facet.label} hint={facet.hint} dim>
          <span className="text-xs text-zinc-400 italic">
            Κανένα published item δεν έχει τιμή σε αυτό το πεδίο.
          </span>
        </PickerBlock>
      );
    }
    return (
      <PickerBlock label={facet.label} hint={facet.hint ?? `${distinct.length} distinct values.`}>
        <div className="flex flex-wrap gap-1.5">
          {distinct.map((opt) => (
            <ChipButton key={opt} active={arr.includes(opt)} onClick={() => onToggle(opt)}>
              {opt}
            </ChipButton>
          ))}
        </div>
      </PickerBlock>
    );
  }

  if (facet.kind === "searchable-chips") {
    if (distinct.length === 0) {
      return (
        <PickerBlock label={facet.label} hint={facet.hint} dim>
          <span className="text-xs text-zinc-400 italic">
            Κανένα published item δεν έχει τιμή σε αυτό το πεδίο.
          </span>
        </PickerBlock>
      );
    }
    return (
      <PickerBlock label={facet.label} hint={facet.hint ?? `${distinct.length} distinct στο dataset.`}>
        <SearchableChips
          options={distinct}
          selected={arr}
          onToggle={onToggle}
          placeholder="Αναζήτηση..."
        />
      </PickerBlock>
    );
  }

  if (facet.kind === "tag-pattern") {
    // Buckets ARE the options — each chip wraps a regex pattern that
    // matches against the row's tags. No distincts needed (the option
    // list is static); selection semantics are OR.
    const buckets = facet.buckets ?? [];
    if (buckets.length === 0) return null;
    return (
      <PickerBlock label={facet.label} hint={facet.hint ?? "OR — match στα metadata.tags με regex."}>
        <div className="flex flex-wrap gap-1.5">
          {buckets.map((b) => (
            <ChipButton key={b.id} active={arr.includes(b.id)} onClick={() => onToggle(b.id)}>
              {b.label}
            </ChipButton>
          ))}
        </div>
      </PickerBlock>
    );
  }

  if (facet.kind === "boolean") {
    // Single-toggle chip. We use "yes" as the selection marker so the
    // facet shows up as "active" in the URL state once toggled.
    const active = arr.length > 0;
    return (
      <PickerBlock label={facet.label} hint={facet.hint ?? `Φιλτράρει σε rows με ${facet.field} = truthy.`}>
        <div className="flex flex-wrap gap-1.5">
          <ChipButton active={active} onClick={() => onToggle("yes")}>
            {active ? "✓ Ενεργό" : "Ενεργοποίηση"}
          </ChipButton>
        </div>
      </PickerBlock>
    );
  }

  if (facet.kind === "amenities") {
    const choices = HOTEL_AMENITY_CHOICES;
    const presentSet = new Set(distinct.map((d) => d.toLowerCase()));
    return (
      <PickerBlock
        label={facet.label}
        hint="AND semantics — ένα item πρέπει να έχει ΟΛΕΣ τις τσεκαρισμένες παροχές."
      >
        <div className="flex flex-wrap gap-1.5">
          {choices.map((c) => {
            const present = presentSet.has(c.id);
            return (
              <ChipButton
                key={c.id}
                active={arr.includes(c.id)}
                onClick={() => onToggle(c.id)}
              >
                <span className={present ? "" : "opacity-50"}>{c.label}</span>
              </ChipButton>
            );
          })}
        </div>
      </PickerBlock>
    );
  }

  // range / year-range — bucket chips
  const buckets = facet.buckets ?? [];
  if (buckets.length === 0) return null;
  return (
    <PickerBlock label={facet.label} hint={facet.hint ?? "Range buckets — OR semantics."}>
      <div className="flex flex-wrap gap-1.5">
        {buckets.map((b) => (
          <ChipButton key={b.id} active={arr.includes(b.id)} onClick={() => onToggle(b.id)}>
            {b.label}
          </ChipButton>
        ))}
      </div>
    </PickerBlock>
  );
}

/** Multi-select typeahead combobox.
 *
 *  Selected items render as removable chips above the input. Typing
 *  filters the dropdown (case-insensitive substring) and shows up to
 *  the first 30 matches — admin can always type more to narrow. The
 *  whole point is admin shouldn't scroll 200 country chips: they type
 *  "ger" and pick Germany.
 *
 *  Uses onMouseDown + preventDefault on options so click registers
 *  before the input's onBlur fires (which would otherwise hide the
 *  dropdown). 200ms onBlur delay catches the case where the user
 *  tabs out before clicking. */
function SearchableChips({
  options,
  selected,
  onToggle,
  placeholder,
  maxRows = 30,
}: {
  options:     string[];
  selected:    string[];
  onToggle:    (opt: string) => void;
  placeholder?: string;
  maxRows?:    number;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);

  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return options.slice(0, maxRows);
    }
    return options
      .filter((o) => o.toLowerCase().includes(q))
      .slice(0, maxRows);
  })();

  return (
    <div>
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 text-white text-[12px] font-medium"
            >
              {s}
              <button
                onClick={() => onToggle(s)}
                className="text-white/70 hover:text-white text-base leading-none -mr-0.5"
                aria-label={`Αφαίρεση ${s}`}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder ?? `Αναζήτηση...`}
          className="w-full px-3 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400"
        />
        {open && (
          <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto border border-zinc-200 rounded bg-white shadow-lg">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400 italic">
                Κανένα match για "{query}"
              </div>
            ) : (
              filtered.map((o) => {
                const isSelected = selected.includes(o);
                return (
                  <button
                    key={o}
                    onMouseDown={(e) => { e.preventDefault(); onToggle(o); }}
                    className={`block w-full text-left px-3 py-1.5 text-xs ${isSelected ? "bg-coral-50 text-coral-700 font-medium" : "hover:bg-zinc-50 text-zinc-700"}`}
                  >
                    {isSelected && <span className="mr-1.5">✓</span>}
                    {o}
                  </button>
                );
              })
            )}
            {!query && options.length > maxRows && (
              <div className="px-3 py-1.5 text-[10px] text-zinc-400 border-t border-zinc-100">
                Πληκτρολόγησε για να βρεις τα υπόλοιπα {options.length - maxRows} ({options.length} σύνολο).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
