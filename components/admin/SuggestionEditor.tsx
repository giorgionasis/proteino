"use client";

import { useState, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

interface ExtFieldsHandle {
  getData(): Record<string, any>;
}

interface SuggestionProps {
  id: string;
  rating: number | null;
  reflection: string | null;
  isPublished: boolean;
  createdAt: string;
  publishedAt: string | null;
  userId: string;
  authorName: string;
}

interface ItemProps {
  id: string;
  title: string;
  slug: string;
  category: string;
  subcategoryId: string | null;
  coverUrl: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  avgRating: number;
  ratingCount: number;
  suggestionCount: number;
  descriptionSeo: string | null;
  metadata: any;
}

type ExtraOptions = Record<string, { value: string; label: string }[]>;

interface Props {
  suggestion: SuggestionProps;
  item: ItemProps;
  extData: Record<string, any>;
  subcategories: { id: string; name: string }[];
  regions: { id: string; name: string; parent_id: string | null }[];
  extraOptions: ExtraOptions;
}

// Helper: get options for a field group, with hardcoded fallback
function getOpts(extraOptions: ExtraOptions, group: string, fallback: string[] = []): string[] {
  const opts = extraOptions[group];
  if (opts && opts.length > 0) return opts.map((o) => o.label);
  return fallback;
}

const COUNTRIES = [
  "Αυστραλία","Αυστρία","Αίγυπτος","Αλβανία","Αργεντινή","Βέλγιο","Βουλγαρία","Βραζιλία",
  "Γαλλία","Γερμανία","Δανία","Ελβετία","Ελλάδα","ΗΠΑ","Ηνωμένο Βασίλειο","Ινδία","Ιαπωνία",
  "Ιρλανδία","Ισλανδία","Ισπανία","Ισραήλ","Ιταλία","Καναδάς","Κίνα","Κολομβία","Κορέα (Νότια)",
  "Κούβα","Κροατία","Κύπρος","Μαρόκο","Μεξικό","Νέα Ζηλανδία","Νορβηγία","Νότια Αφρική",
  "Ολλανδία","Ουγγαρία","Ουκρανία","Πολωνία","Πορτογαλία","Ρουμανία","Ρωσία","Σερβία",
  "Σκωτία","Σουηδία","Ταϊλάνδη","Τουρκία","Τσεχία","Φινλανδία","Χιλή",
];

const OSCAR_CATEGORIES = ["Best Picture","Best Director","Best Actor","Best Actress","Best Supporting Actor","Best Supporting Actress","Best Screenplay","Best Cinematography","Best Score","Best Editing","Best Visual Effects","Best Animated Feature"];
const BAFTA_CATEGORIES = ["Best Film","Best Director","Best Leading Actor","Best Leading Actress","Best Supporting Actor","Best Supporting Actress","Best Screenplay"];
const GOLDEN_GLOBE_CATEGORIES = ["Best Motion Picture – Drama","Best Motion Picture – Musical/Comedy","Best Director","Best Actor – Drama","Best Actress – Drama","Best Actor – Musical/Comedy","Best Actress – Musical/Comedy"];
const CANNES_CATEGORIES = ["Palme d'Or","Grand Prix","Best Director","Jury Prize","Best Actor","Best Actress","Best Screenplay"];


function getMediaConfig(category: string): { tabs: string[]; mode: "single" | "gallery" } {
  switch (category) {
    case "food": return { tabs: ["Εξωτερικά", "Εσωτερικά", "Πιάτα"], mode: "gallery" };
    case "bars": return { tabs: ["Εσωτερικά", "Εξωτερικά"], mode: "gallery" };
    case "hotels": return { tabs: ["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"], mode: "gallery" };
    case "theater": case "events": return { tabs: ["Landscape", "Trailer"], mode: "single" };
    default: return { tabs: ["Portrait", "Landscape", "Trailer"], mode: "single" };
  }
}

export function SuggestionEditor({ suggestion, item, extData, subcategories, regions, extraOptions }: Props) {
  const [title, setTitle] = useState(item.title);
  const [slug, setSlug] = useState(item.slug);
  const [category, setCategory] = useState(item.category);
  const [subcategoryId, setSubcategoryId] = useState(item.subcategoryId ?? "");
  const [isPublished, setIsPublished] = useState(suggestion.isPublished);
  const [descriptionSeo, setDescriptionSeo] = useState(item.descriptionSeo ?? "");
  const [reflection, setReflection] = useState(suggestion.reflection ?? "");
  const [mediaTab, setMediaTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const extFieldsRef = useRef<ExtFieldsHandle>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setSaveStatus("idle");

    const extPayload = extFieldsRef.current?.getData() ?? {};

    const res = await fetch("/api/admin/suggestions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestionId: suggestion.id,
        itemId: item.id,
        category,
        itemData: {
          title,
          slug,
          category,
          subcategory_id: subcategoryId || null,
          description_seo: descriptionSeo || null,
        },
        suggestionData: {
          is_published: isPublished,
          reflection: reflection || null,
          published_at: isPublished && !suggestion.publishedAt ? new Date().toISOString() : suggestion.publishedAt,
        },
        extData: extPayload,
      }),
    });

    setSaving(false);
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSaveStatus("idle"), 3000);
  }, [title, slug, category, subcategoryId, descriptionSeo, isPublished, reflection, item.id, suggestion.id, suggestion.publishedAt]);

  const mediaConfig = getMediaConfig(category);

  return (
    <div>
      {/* Breadcrumb + Save */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/admin/suggestions" className="text-emerald-600 hover:underline font-medium">Suggestions</Link>
          <span className="text-zinc-400">/</span>
          <span className="text-zinc-600">Επεξεργασία Πρότασης</span>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && <span className="text-sm text-emerald-600 font-medium">Saved!</span>}
          {saveStatus === "error" && <span className="text-sm text-red-500 font-medium">Error saving</span>}
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Main card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-8">
        <div className="flex gap-12">
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Slug</label>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-500 focus:outline-none focus:border-zinc-400" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Category</label>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setMediaTab(0); }} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">SELECT CATEGORY</option>
                  {CATEGORIES.map((c) => (<option key={c.slug} value={c.slug}>{c.labelEl}</option>))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Subcategory</label>
                <select value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">SELECT SUBCATEGORY</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Publish</label>
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
                  <button onClick={() => setIsPublished(true)} className={`px-5 py-2 text-sm font-semibold transition-colors ${isPublished ? "bg-emerald-600 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}>YES</button>
                  <button onClick={() => setIsPublished(false)} className={`px-5 py-2 text-sm font-semibold transition-colors ${!isPublished ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}>NO</button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Author</label>
                <div className="px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-zinc-50">
                  {suggestion.authorName}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Created</label>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-zinc-50">
                  {formatDate(suggestion.createdAt)}
                  <CalendarIcon />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Published</label>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-zinc-50">
                  {suggestion.publishedAt ? formatDate(suggestion.publishedAt) : "—"}
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Rating panel */}
          <div className="w-[220px] shrink-0">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-amber-500 text-xl">★</span>
              <span className="text-3xl font-bold text-zinc-800">{item.avgRating.toFixed(2)}</span>
            </div>
            <div className="flex gap-6 mb-4 text-sm text-zinc-500">
              <span><strong className="text-zinc-700">{item.ratingCount}</strong> ΒΑΘΜΟΛΟΓΙΕΣ</span>
              <span><strong className="text-zinc-700">{item.suggestionCount}</strong> ΠΡΟΤΑΣΕΙΣ</span>
            </div>
            {suggestion.rating !== null && (
              <div className="mt-3 p-3 bg-zinc-50 rounded-lg">
                <p className="text-xs text-zinc-500 mb-1">User rating</p>
                <span className="text-lg font-bold text-zinc-800">★ {suggestion.rating}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Description / SEO */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">Description (SEO)</h2>
        <textarea
          value={descriptionSeo}
          onChange={(e) => setDescriptionSeo(e.target.value)}
          placeholder="Short SEO description for this item..."
          className="w-full h-24 px-4 py-3 text-sm text-zinc-700 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
        />
      </div>

      {/* Reflection */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">User Reflection</h2>
        <textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="User's reflection about this item..."
          className="w-full h-32 px-4 py-3 text-sm text-zinc-700 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
        />
      </div>

      {/* Media — category-aware */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Media</h2>
          {mediaConfig.mode === "gallery" && (
            <span className="text-xs text-zinc-400">Drag & drop to reorder — first item is the default</span>
          )}
        </div>
        <div className="flex gap-1 mb-6">
          {mediaConfig.tabs.map((tab, i) => (
            <button key={tab} onClick={() => setMediaTab(i)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mediaTab === i ? "bg-zinc-100 text-zinc-800" : "text-zinc-500 hover:text-zinc-700"}`}>{tab}</button>
          ))}
        </div>

        {mediaConfig.mode === "single" ? (
          mediaConfig.tabs[mediaTab] === "Trailer" ? (
            <div className="border border-zinc-200 rounded-xl p-6 bg-zinc-50/50">
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Trailer URL</label>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-red-600 w-20 shrink-0">YouTube</span>
                  <input type="text" placeholder="https://www.youtube.com/watch?v=..." className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-zinc-600 w-20 shrink-0">Vimeo</span>
                  <input type="text" placeholder="https://vimeo.com/..." className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                </div>
              </div>
            </div>
          ) : (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
            <div className="w-[200px] h-[280px] bg-zinc-200 rounded-lg flex items-center justify-center mb-4">
              <ImagePlaceholderIcon />
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">
                <PenIcon /> Change
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 border border-zinc-200 rounded-lg hover:bg-red-50">
                <TrashIcon /> Delete
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-3">image-{mediaConfig.tabs[mediaTab]?.toLowerCase()}.jpg</p>
          </div>
          )
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shrink-0">
                <div className="w-[160px] h-[120px] bg-zinc-200 rounded-lg mb-2 flex items-center justify-center">
                  <ImagePlaceholderIcon />
                </div>
                <div className="flex gap-1.5">
                  <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-600 border border-zinc-200 rounded-md hover:bg-emerald-50">
                    <PenIcon size={10} /> Change
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-500 border border-zinc-200 rounded-md hover:bg-red-50">
                    <TrashIcon size={10} /> Delete
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">{mediaConfig.tabs[mediaTab]?.toLowerCase()}-{i + 1}.jpg</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ExtraFields */}
      <ExtraFieldsSection ref={extFieldsRef} category={category} extData={extData} regions={regions} extraOptions={extraOptions} />
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
}

/* ─────────────── ExtraFields Router ─────────────── */

const ExtraFieldsSection = forwardRef<ExtFieldsHandle, { category: string; extData: Record<string, any>; regions: any[]; extraOptions: ExtraOptions }>(
  function ExtraFieldsSection({ category, extData, regions, extraOptions }, ref) {
    switch (category) {
      case "movies": return <MovieExtraFields ref={ref} data={extData} extraOptions={extraOptions} />;
      case "books": return <BookExtraFields ref={ref} data={extData} extraOptions={extraOptions} />;
      case "series": return <SeriesExtraFields ref={ref} data={extData} extraOptions={extraOptions} />;
      case "food": return <FoodExtraFields ref={ref} data={extData} regions={regions} extraOptions={extraOptions} />;
      case "bars": return <BarsExtraFields ref={ref} data={extData} regions={regions} extraOptions={extraOptions} />;
      case "hotels": return <HotelExtraFields ref={ref} data={extData} regions={regions} extraOptions={extraOptions} />;
      case "recipes": return <RecipeExtraFields ref={ref} data={extData} extraOptions={extraOptions} />;
      case "theater": case "events": return <TheaterExtraFields ref={ref} data={extData} regions={regions} extraOptions={extraOptions} />;
      default: return null;
    }
  }
);

/* ─────────────── MOVIES ─────────────── */

const MovieExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; extraOptions: ExtraOptions }>(
function MovieExtraFields({ data, extraOptions }, ref) {
  const initDirectors = Array.isArray(data.director) ? data.director.map((d: any) => typeof d === "string" ? d : d.name || "") : (data.director ? [String(data.director)] : [""]);
  const initCountries = Array.isArray(data.country) ? data.country : (data.country ? [data.country] : [""]);
  const initActors = Array.isArray(data.actors) ? data.actors.map((a: any) => ({ name: typeof a === "string" ? a : a.name || "", avatar: a.avatar || "" })) : Array.from({ length: 8 }, () => ({ name: "", avatar: "" }));
  const initAwards = Array.isArray(data.awards) ? data.awards : [];

  const [directors, setDirectors] = useState(initDirectors.length ? initDirectors : [""]);
  const [countries, setCountries] = useState(initCountries.length ? initCountries : [""]);
  const [actors, setActors] = useState(initActors.length ? initActors : Array.from({ length: 8 }, () => ({ name: "", avatar: "" })));
  const [awards, setAwards] = useState<{ type: string; category: string; year: string }[]>(initAwards);
  const [plot, setPlot] = useState(data.plot ?? "");
  const [durationMin, setDurationMin] = useState(data.duration_min?.toString() ?? "");
  const [releaseYear, setReleaseYear] = useState(data.release_date ? new Date(data.release_date).getFullYear().toString() : "");
  const [language, setLanguage] = useState(data.language ?? "");
  const [channel, setChannel] = useState(data.channel ?? "");
  const [trailerUrl, setTrailerUrl] = useState(data.trailer_url ?? "");

  useImperativeHandle(ref, () => ({
    getData() {
      const filteredDirectors = directors.filter(Boolean);
      const filteredCountries = countries.filter(Boolean);
      const filteredActors = actors.filter((a) => a.name);
      return {
        director: filteredDirectors.join(", ") || null,
        country: filteredCountries.join(", ") || null,
        actors: filteredActors.length > 0 ? filteredActors : null,
        awards: awards.length > 0 ? awards : null,
        plot: plot || null,
        duration_min: durationMin ? parseInt(durationMin) : null,
        release_date: releaseYear ? `${releaseYear}-01-01` : null,
        language: language || null,
        channel: channel || null,
        trailer_url: trailerUrl || null,
      };
    }
  }));

  const addAward = (type: string) => setAwards((a) => [...a, { type, category: "", year: "" }]);

  const getAwardCategories = (type: string) => {
    switch (type) {
      case "Oscar": return getOpts(extraOptions, "award_oscar", OSCAR_CATEGORIES);
      case "BAFTA": return getOpts(extraOptions, "award_bafta", BAFTA_CATEGORIES);
      case "Golden Globe": return getOpts(extraOptions, "award_golden_globe", GOLDEN_GLOBE_CATEGORIES);
      case "Cannes": return getOpts(extraOptions, "award_cannes", CANNES_CATEGORIES);
      default: return [];
    }
  };

  const movieCountries = getOpts(extraOptions, "country", COUNTRIES);
  const movieAttributes = getOpts(extraOptions, "attributes", [
    "Based on true events", "Based on a book", "Remake", "Sequel", "Prequel",
    "Contains violence", "Contains sex", "Classic", "Independent film",
    "Black & White", "Foreign language", "Animated"
  ]);

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Year</label>
          <input type="text" value={releaseYear} onChange={(e) => setReleaseYear(e.target.value)} placeholder="2024" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Duration</label>
          <input type="text" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} placeholder="127" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>

        {/* Country with autocomplete */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Country</label>
          {countries.map((c, i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 0 ? "mt-2" : ""}`}>
              <input
                type="text"
                list="countries-list"
                value={c}
                onChange={(e) => setCountries((cs) => cs.map((v, j) => j === i ? e.target.value : v))}
                placeholder="Αναζήτηση χώρας..."
                className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
              />
              {i > 0 && (
                <button onClick={() => setCountries((cs) => cs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setCountries((cs) => [...cs, ""])} className="mt-2 w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon />
          </button>
        </div>

        {/* Director with + */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Director</label>
          {directors.map((d, i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 0 ? "mt-2" : ""}`}>
              <input type="text" value={d} onChange={(e) => setDirectors((ds) => ds.map((v, j) => j === i ? e.target.value : v))} placeholder="Αναζήτηση σκηνοθέτη..." className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
              {i > 0 && (
                <button onClick={() => setDirectors((d) => d.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setDirectors((d) => [...d, ""])} className="mt-2 w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon />
          </button>
        </div>
      </div>

      {/* Actors with avatars */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Actors</label>
        <div className="grid grid-cols-4 gap-3">
          {actors.map((actor, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 border border-zinc-200 rounded-lg">
              <div className="relative shrink-0 group">
                <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                  {actor.avatar ? (
                    <img src={actor.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  )}
                </div>
                <button className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <PenIcon size={10} />
                </button>
              </div>
              <input
                type="text"
                value={actor.name}
                onChange={(e) => setActors((a) => a.map((ac, j) => j === i ? { ...ac, name: e.target.value } : ac))}
                placeholder="Ηθοποιός"
                className="flex-1 min-w-0 px-2 py-1.5 border border-zinc-200 rounded text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
              />
            </div>
          ))}
        </div>
        <button onClick={() => setActors((a) => [...a, { name: "", avatar: "" }])} className="mt-3 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800">
          <PlusIcon size={14} /> Add Actor
        </button>
      </div>

      {/* Awards split by type */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Awards</label>
        <div className="flex gap-2 mb-4">
          {["Oscar", "BAFTA", "Golden Globe", "Cannes"].map((type) => (
            <button key={type} onClick={() => addAward(type)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-colors">
              <PlusIcon size={12} /> {type}
            </button>
          ))}
        </div>
        {awards.length > 0 && (
          <div className="space-y-3">
            {awards.map((award, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg bg-zinc-50/50">
                <span className="text-xs font-bold text-zinc-700 w-24 shrink-0">{award.type}</span>
                <select
                  value={award.category}
                  onChange={(e) => setAwards((a) => a.map((aw, j) => j === i ? { ...aw, category: e.target.value } : aw))}
                  className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="">Επιλογή κατηγορίας...</option>
                  {getAwardCategories(award.type).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={award.year}
                  onChange={(e) => setAwards((a) => a.map((aw, j) => j === i ? { ...aw, year: e.target.value } : aw))}
                  placeholder="Χρονιά"
                  className="w-20 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
                />
                <button onClick={() => setAwards((a) => a.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {awards.length === 0 && (
          <p className="text-sm text-zinc-400 italic">Πατήστε ένα κουμπί βραβείου για να προσθέσετε</p>
        )}
      </div>

      {/* Attributes */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Attributes</label>
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          {movieAttributes.map((attr) => (
            <label key={attr} className="flex items-center gap-2 text-sm text-zinc-600 py-1">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {attr}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Plot</label>
        <textarea value={plot} onChange={(e) => setPlot(e.target.value)} placeholder="Type your message here..." className="w-full h-28 px-4 py-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
      </div>

      <datalist id="countries-list">
        {movieCountries.map((c) => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
});

/* ─────────────── BOOKS ─────────────── */

const BookExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; extraOptions: ExtraOptions }>(
function BookExtraFields({ data, extraOptions }, ref) {
  const [writer, setWriter] = useState(data.writer ?? "");
  const [publication, setPublication] = useState(data.publication ?? "");
  const [language, setLanguage] = useState(data.language ?? "");
  const [pages, setPages] = useState(data.pages?.toString() ?? "");
  const [pubYear, setPubYear] = useState(data.publication_year?.toString() ?? "");
  const [plot, setPlot] = useState(data.plot ?? "");
  const [isTrilogy, setIsTrilogy] = useState(data.is_trilogy ?? false);
  const [trilogyName, setTrilogyName] = useState(data.trilogy_name ?? "");

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        writer: writer || null,
        publication: publication || null,
        language: language || null,
        pages: pages ? parseInt(pages) : null,
        publication_year: pubYear ? parseInt(pubYear) : null,
        plot: plot || null,
        is_trilogy: isTrilogy,
        trilogy_name: trilogyName || null,
      };
    }
  }));

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Author</label>
          <input type="text" value={writer} onChange={(e) => setWriter(e.target.value)} placeholder="Sebastian Fitzek" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Editor</label>
          <input type="text" value={publication} onChange={(e) => setPublication(e.target.value)} placeholder="Διόπτρα" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Language</label>
          <input type="text" value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Ελληνικά" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Pages</label>
          <input type="text" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="432" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Released</label>
          <input type="text" value={pubYear} onChange={(e) => setPubYear(e.target.value)} placeholder="2001" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
      </div>

      {/* Plot */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Plot</label>
        <textarea value={plot} onChange={(e) => setPlot(e.target.value)} placeholder="Type your message here..." className="w-full h-28 px-4 py-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
      </div>

      {/* Trilogy */}
      <div className="mb-6">
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input type="checkbox" checked={isTrilogy} onChange={(e) => setIsTrilogy(e.target.checked)} className="w-4 h-4 rounded border-zinc-300" />
          Part of a trilogy/series
        </label>
        {isTrilogy && (
          <input type="text" value={trilogyName} onChange={(e) => setTrilogyName(e.target.value)} placeholder="Trilogy name..." className="mt-2 w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        )}
      </div>
    </div>
  );
});

/* ─────────────── SERIES ─────────────── */

const SeriesExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; extraOptions: ExtraOptions }>(
function SeriesExtraFields({ data, extraOptions }, ref) {
  const initCountries = Array.isArray(data.country) ? data.country : (data.country ? [data.country] : [""]);
  const [countries, setCountries] = useState(initCountries.length ? initCountries : [""]);
  const [seasons, setSeasons] = useState(data.seasons?.toString() ?? "");
  const [director, setDirector] = useState(data.director ?? "");
  const [releaseDate, setReleaseDate] = useState(data.release_date ? new Date(data.release_date).getFullYear().toString() : "");
  const [endDate, setEndDate] = useState(data.end_date ? new Date(data.end_date).getFullYear().toString() : "");
  const [statusMessage, setStatusMessage] = useState(data.status_message ?? "");
  const [channel, setChannel] = useState(data.channel ?? "");
  const [language, setLanguage] = useState(data.language ?? "");
  const [plot, setPlot] = useState(data.plot ?? "");
  const [trailerUrl, setTrailerUrl] = useState(data.trailer_url ?? "");
  const [actors, setActors] = useState<any[]>(Array.isArray(data.actors) ? data.actors : []);

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        director: director || null,
        seasons: seasons ? parseInt(seasons) : null,
        release_date: releaseDate ? `${releaseDate}-01-01` : null,
        end_date: endDate ? `${endDate}-01-01` : null,
        country: countries.filter(Boolean).join(", ") || null,
        language: language || null,
        channel: channel || null,
        trailer_url: trailerUrl || null,
        status_message: statusMessage || null,
        plot: plot || null,
        actors: actors.length > 0 ? actors : null,
      };
    }
  }));

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Seasons</label>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">No</label>
          <input type="text" value={seasons} onChange={(e) => setSeasons(e.target.value)} placeholder="4" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Released</label>
          <input type="text" value={releaseDate} onChange={(e) => setReleaseDate(e.target.value)} placeholder="2022" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">End</label>
          <input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Info</label>
          <input type="text" value={statusMessage} onChange={(e) => setStatusMessage(e.target.value)} placeholder="Σύντομα ξεκινάει ακόμη μια σεζόν" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Attributes</label>
        <div className="grid grid-cols-2 gap-2">
          {getOpts(extraOptions, "attributes", [
            "Contain UFO", "Based on true events", "Contain SEX",
            "Series of one season", "Contain Religion", "Series is completed"
          ]).map((attr) => (
            <label key={attr} className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {attr}
            </label>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Country</label>
        <div className="flex items-center gap-2 flex-wrap">
          {countries.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              <input
                type="text"
                list="countries-list-series"
                value={c}
                onChange={(e) => setCountries((cs) => cs.map((v, j) => j === i ? e.target.value : v))}
                placeholder="Αναζήτηση χώρας..."
                className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400 w-44"
              />
              {i > 0 && (
                <button onClick={() => setCountries((cs) => cs.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
          <button onClick={() => setCountries((cs) => [...cs, ""])} className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon />
          </button>
        </div>
        <datalist id="countries-list-series">
          {getOpts(extraOptions, "country", COUNTRIES).map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Streaming</label>
        <div className="grid grid-cols-4 gap-3">
          {getOpts(extraOptions, "streaming", ["Netflix", "Disney+", "Prime", "YouTube"]).map((name) => (
            <div key={name} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold text-sm">
                {name.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-zinc-600">{name}</span>
              <input type="text" placeholder="Χωρίς Τίτλο" className="w-full text-center text-xs border border-zinc-200 rounded px-1 py-1.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
            </div>
          ))}
        </div>
      </div>

      <SelectGrid label="Actors" placeholder="Επιλογή Ηθοποιού" count={8} />
      <SelectGrid label="Awards" placeholder="Επιλογή Βραβείου" count={8} />
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Plot</label>
        <textarea value={plot} onChange={(e) => setPlot(e.target.value)} placeholder="Type your message here..." className="w-full h-28 px-4 py-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
      </div>
    </div>
  );
});

/* ─────────────── FOOD / RESTAURANT ─────────────── */

const FoodExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; regions: any[]; extraOptions: ExtraOptions }>(
function FoodExtraFields({ data, regions, extraOptions }, ref) {
  const [address, setAddress] = useState(data.address ?? "");
  const [telephone, setTelephone] = useState(data.telephone ?? "");
  const [lat, setLat] = useState(data.lat?.toString() ?? "");
  const [lng, setLng] = useState(data.lng?.toString() ?? "");
  const [plot, setPlot] = useState(data.plot ?? "");
  const [cuisine, setCuisine] = useState(data.cuisine ?? "");
  const [type, setType] = useState(data.type ?? "");
  const [regionId, setRegionId] = useState(data.region_id ?? "");
  const [deliveryLinks, setDeliveryLinks] = useState<Record<string, string>>(
    typeof data.delivery_links === "object" && data.delivery_links ? data.delivery_links : {}
  );
  const [information, setInformation] = useState<Record<string, any>>(
    typeof data.information === "object" && data.information ? data.information : {}
  );

  const parentRegions = regions.filter((r) => !r.parent_id);
  const childRegions = regions.filter((r) => r.parent_id);

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        address: address || null,
        telephone: telephone || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        cuisine: cuisine || null,
        type: type || null,
        region_id: regionId || null,
        plot: plot || null,
        delivery_links: Object.keys(deliveryLinks).length > 0 ? deliveryLinks : null,
        information: Object.keys(information).length > 0 ? information : null,
      };
    }
  }));

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <RegionSelect regionId={regionId} setRegionId={setRegionId} parentRegions={parentRegions} childRegions={childRegions} />

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Telephone</label>
          <input type="text" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="211 303 4793" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <FieldInput label="Information" placeholder="https://www.facebook.com/..." />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Source</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white">
            <option>Facebook</option><option>Instagram</option><option>Website</option><option>TripAdvisor</option>
          </select>
        </div>
      </div>

      {/* Attributes / Facilities */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Attributes</label>
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          {getOpts(extraOptions, "attributes", ["Parking", "Wi-Fi", "Outdoor Seating", "Kid Friendly", "Pet Friendly", "Reservations", "Takeaway", "Delivery", "Live Music", "Accessible", "Smoking Area", "Credit Cards"]).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {a}
            </label>
          ))}
        </div>
      </div>

      {/* Delivery */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Delivery</label>
        <div className="space-y-3">
          {getOpts(extraOptions, "delivery_provider", ["efood", "Wolt", "Box"]).map((name) => (
            <DeliveryRow key={name} name={name} color="#71717a" placeholder={`https://${name.toLowerCase()}.gr/...`} />
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─────────────── BARS / CAFES ─────────────── */

const BarsExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; regions: any[]; extraOptions: ExtraOptions }>(
function BarsExtraFields({ data, regions, extraOptions }, ref) {
  const [address, setAddress] = useState(data.address ?? "");
  const [telephone, setTelephone] = useState(data.telephone ?? "");
  const [lat, setLat] = useState(data.lat?.toString() ?? "");
  const [lng, setLng] = useState(data.lng?.toString() ?? "");
  const [plot, setPlot] = useState(data.plot ?? "");
  const [type, setType] = useState(data.type ?? "");
  const [regionId, setRegionId] = useState(data.region_id ?? "");
  const [information, setInformation] = useState<Record<string, any>>(
    typeof data.information === "object" && data.information ? data.information : {}
  );

  const parentRegions = regions.filter((r) => !r.parent_id);
  const childRegions = regions.filter((r) => r.parent_id);

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        address: address || null,
        telephone: telephone || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        type: type || null,
        region_id: regionId || null,
        plot: plot || null,
        information: Object.keys(information).length > 0 ? information : null,
      };
    }
  }));

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <RegionSelect regionId={regionId} setRegionId={setRegionId} parentRegions={parentRegions} childRegions={childRegions} />

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Telephone</label>
          <input type="text" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="211 303 4793" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <FieldInput label="Information" placeholder="https://www.facebook.com/..." />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Source</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white">
            <option>Facebook</option><option>Instagram</option><option>Website</option>
          </select>
        </div>
      </div>

      {/* Type */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Type</label>
        <div className="flex flex-wrap gap-3">
          {getOpts(extraOptions, "type", ["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee Shop", "Speakeasy", "Pub", "All-Day", "Sports Bar"]).map((t) => (
            <label key={t} className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 cursor-pointer hover:border-zinc-300">
              <input type="radio" name="barType" className="w-4 h-4" />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* Attributes */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Attributes</label>
        <div className="grid grid-cols-3 gap-x-8 gap-y-2">
          {getOpts(extraOptions, "attributes", ["Parking", "Wi-Fi", "Outdoor Seating", "Live Music", "DJ", "Pet Friendly", "Reservations", "Smoking Area", "Accessible", "Credit Cards", "Happy Hour", "Late Night"]).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {a}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─────────────── HOTELS ─────────────── */

const HotelExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; regions: any[]; extraOptions: ExtraOptions }>(
function HotelExtraFields({ data, regions, extraOptions }, ref) {
  const initLinks = Array.isArray(data.availability_links) ? data.availability_links : [{ url: "" }];
  const [availabilities, setAvailabilities] = useState(initLinks.length ? initLinks : [{ url: "" }]);
  const [address, setAddress] = useState(data.address ?? "");
  const [telephone, setTelephone] = useState(data.telephone ?? "");
  const [lat, setLat] = useState(data.lat?.toString() ?? "");
  const [lng, setLng] = useState(data.lng?.toString() ?? "");
  const [plot, setPlot] = useState(data.plot ?? "");
  const [type, setType] = useState(data.type ?? "");
  const [priceRange, setPriceRange] = useState(data.price_range ?? "");
  const [regionId, setRegionId] = useState(data.region_id ?? "");
  const [facilities, setFacilities] = useState<any>(data.facilities ?? {});

  const parentRegions = regions.filter((r) => !r.parent_id);
  const childRegions = regions.filter((r) => r.parent_id);

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        address: address || null,
        telephone: telephone || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        type: type || null,
        price_range: priceRange || null,
        region_id: regionId || null,
        plot: plot || null,
        facilities: Object.keys(facilities).length > 0 ? facilities : null,
      };
    }
  }));

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <RegionSelect regionId={regionId} setRegionId={setRegionId} parentRegions={parentRegions} childRegions={childRegions} />

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Telephone</label>
          <input type="text" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="211 303 4793" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <FieldInput label="INFORMATION" placeholder="https://www.facebook.com/r-diadrom" />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Source</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Facebook</option><option>Website</option></select>
        </div>
      </div>

      {/* Type */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Type</label>
        <div className="flex gap-3 flex-wrap">
          {getOpts(extraOptions, "type", ["Διαμέρισμα", "Δωμάτιο", "Camping", "Μονοκατοικία", "Ξενοδοχείο"]).map((t) => (
            <label key={t} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 rounded-lg hover:border-zinc-300 min-w-[90px] cursor-pointer">
              <input type="radio" name="hotelType" className="sr-only peer" />
              <div className="w-10 h-10 rounded-full bg-zinc-100 peer-checked:bg-emerald-100 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-500"><path d="M3 21h18M3 7v14M21 7v14M6 7V4a1 1 0 011-1h10a1 1 0 011 1v3M9 21v-4h6v4" /></svg>
              </div>
              <span className="text-xs text-zinc-600">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Amenities */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Παροχές</label>
          {getOpts(extraOptions, "amenities_facilities", ["Pool", "Bar", "Restaurant", "Parking", "Breakfast"]).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1"><input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />{a}</label>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Δωμάτιο</label>
          {getOpts(extraOptions, "amenities_room", ["Sea view", "Mountain View", "Wifi"]).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1"><input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />{a}</label>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Extra</label>
          {getOpts(extraOptions, "amenities_extra", ["Pet Friendly", "Disabilities", "Transfer"]).map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1"><input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />{a}</label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Availability</label>
        <div className="space-y-3">
          {availabilities.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-4 border border-zinc-200 rounded-lg">
              <span className="text-sm font-bold text-blue-600 shrink-0">Booking</span>
              <input type="text" defaultValue={a.url} className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
              {i > 0 && (
                <button onClick={() => setAvailabilities((av) => av.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setAvailabilities((a) => [...a, { url: "" }])} className="mt-3 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800">
          <PlusIcon /> Add Availability
        </button>
      </div>
    </div>
  );
});

/* ─────────────── RECIPES ─────────────── */

const RecipeExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; extraOptions: ExtraOptions }>(
function RecipeExtraFields({ data, extraOptions }, ref) {
  const initIngredients = Array.isArray(data.ingredients) ? data.ingredients : [{ qty: "", unit: "", name: "", link: "" }];
  const initSteps = Array.isArray(data.steps) ? data.steps.map((s: any) => typeof s === "string" ? s : s.text || "") : [""];
  const initTips = Array.isArray(data.tips) ? data.tips.map((t: any) => typeof t === "string" ? t : t.text || "") : [""];

  const [ingredients, setIngredients] = useState(initIngredients.length ? initIngredients : [{ qty: "", unit: "", name: "", link: "" }]);
  const [steps, setSteps] = useState(initSteps.length ? initSteps : [""]);
  const [tips, setTips] = useState(initTips.length ? initTips : [""]);
  const [level, setLevel] = useState(data.level ?? "");
  const [calories, setCalories] = useState(data.calories?.toString() ?? "");
  const [channel, setChannel] = useState(data.channel ?? "");
  const [origin, setOrigin] = useState(data.origin ?? "");
  const [yields, setYields] = useState(data.yields?.toString() ?? "");

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        ingredients: ingredients.filter((i) => i.name),
        steps: steps.filter(Boolean),
        tips: tips.filter(Boolean).join("\n") || null,
        level: level || null,
        calories: calories ? parseInt(calories) : null,
        channel: channel || null,
        origin: origin || null,
        yields: yields ? parseInt(yields) : null,
      };
    }
  }));

  const UNITS = getOpts(extraOptions, "unit", ["κ.γ.", "κ.σ.", "κούπα", "κούπες", "γρ.", "κιλό", "ml", "lt", "τεμ", "φέτες", "ματσάκι"]);
  const NUTRITION = getOpts(extraOptions, "nutrition", ["Vegan", "Milk", "Sugar", "Gluten Free", "Nut Free"]);
  const LEVELS = getOpts(extraOptions, "level", ["Easy", "Medium", "Hard"]);
  const COMMON_INGREDIENTS = getOpts(extraOptions, "common_ingredient", ["αλεύρι", "ζάχαρη", "βούτυρο", "αυγά", "γάλα", "αλάτι", "πιπέρι", "ελαιόλαδο", "κρεμμύδι", "σκόρδο"]);

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      {/* Ingredients */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Ingredients</label>
          <button onClick={() => setIngredients((ings) => [...ings, { qty: "", unit: "", name: "", link: "" }])} className="w-6 h-6 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon size={12} />
          </button>
        </div>
        <table className="w-full border border-zinc-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="w-10 px-3 py-2" />
              <th className="w-10 px-3 py-2 text-left text-xs font-semibold text-zinc-500">#</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Ποσότητα</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Μονάδα</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Υλικό</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">Link</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, i) => (
              <tr key={i} className="border-b border-zinc-100">
                <td className="px-3 py-2 text-zinc-400 cursor-grab">⋮⋮</td>
                <td className="px-3 py-2 text-sm text-zinc-500">{i + 1}</td>
                <td className="px-3 py-2"><input type="text" defaultValue={ing.qty} className="w-16 px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" /></td>
                <td className="px-3 py-2">
                  <select defaultValue={ing.unit} className="w-24 px-2 py-1.5 text-sm border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400">
                    <option value="">—</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input type="text" defaultValue={ing.name} placeholder="Αναζήτηση υλικού..." className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" list="ingredient-suggestions" />
                </td>
                <td className="px-3 py-2">
                  <input type="text" defaultValue={ing.link} placeholder="https://..." className="w-full px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                </td>
                <td className="px-3 py-2">
                  {ingredients.length > 1 && (
                    <button onClick={() => setIngredients((ings) => ings.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <datalist id="ingredient-suggestions">
          {COMMON_INGREDIENTS.map((i) => <option key={i} value={i} />)}
        </datalist>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Steps</label>
          <button onClick={() => setSteps((s) => [...s, ""])} className="w-6 h-6 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {steps.map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-7 h-7 flex items-center justify-center bg-emerald-600 text-white text-sm font-bold rounded-full shrink-0 mt-1">{i + 1}</span>
              <textarea placeholder="Περιγραφή βήματος..." className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none h-16 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
              {steps.length > 1 && (
                <button onClick={() => setSteps((s) => s.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tips</label>
          <button onClick={() => setTips((t) => [...t, ""])} className="w-6 h-6 flex items-center justify-center border border-zinc-200 rounded-full text-zinc-500 hover:bg-zinc-50">
            <PlusIcon size={12} />
          </button>
        </div>
        <div className="space-y-3">
          {tips.map((_, i) => (
            <div key={i} className="flex gap-3 items-start">
              <span className="w-7 h-7 flex items-center justify-center bg-amber-400 text-white text-sm font-bold rounded-full shrink-0 mt-1">{i + 1}</span>
              <textarea placeholder="Enter tip..." className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none h-16 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
              {tips.length > 1 && (
                <button onClick={() => setTips((t) => t.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 mt-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chef / Origin + Meta */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <FieldInput label="Chef" placeholder="Άκης Πετρετζίκης" />
        <FieldInput label="Website" placeholder="https://akispetretzikis.com" />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Level</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <FieldInput label="Calories" placeholder="320" />
      </div>

      {/* Duration split into prep + cooking */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Duration</label>
        <div className="grid grid-cols-2 gap-6">
          <div className="border border-zinc-200 rounded-lg p-4">
            <span className="block text-xs font-semibold text-zinc-600 mb-2">Χρόνος Προετοιμασίας</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" placeholder="0" className="w-16 px-2 py-2 text-sm border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                <span className="text-xs text-zinc-500">Ώρες</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" max="59" placeholder="30" className="w-16 px-2 py-2 text-sm border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                <span className="text-xs text-zinc-500">Λεπτά</span>
              </div>
            </div>
          </div>
          <div className="border border-zinc-200 rounded-lg p-4">
            <span className="block text-xs font-semibold text-zinc-600 mb-2">Χρόνος Ψησίματος</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" placeholder="1" className="w-16 px-2 py-2 text-sm border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                <span className="text-xs text-zinc-500">Ώρες</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" max="59" placeholder="15" className="w-16 px-2 py-2 text-sm border border-zinc-200 rounded-lg text-center focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
                <span className="text-xs text-zinc-500">Λεπτά</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Nutrition</label>
        <div className="flex gap-4 flex-wrap">
          {NUTRITION.map((n) => (
            <label key={n} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300" />
              {n}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
});

/* ─────────────── THEATER / EVENTS ─────────────── */

const TheaterExtraFields = forwardRef<ExtFieldsHandle, { data: Record<string, any>; regions: any[]; extraOptions: ExtraOptions }>(
function TheaterExtraFields({ data, regions, extraOptions }, ref) {
  const [eventType, setEventType] = useState<"single" | "tour">("single");
  const [adsActive, setAdsActive] = useState(false);
  const initDates = Array.isArray(data.dates) ? data.dates : [
    { status: "high", from: "10/03/25", to: "15/03/25", price: "25€" },
    { status: "low", from: "18/03/25", to: "22/03/25", price: "30€" },
  ];
  const [dates, setDates] = useState(initDates);
  const [writer, setWriter] = useState(data.writer ?? "");
  const [director, setDirector] = useState(data.director ?? "");
  const [year, setYear] = useState(data.year?.toString() ?? "");
  const [namePlace, setNamePlace] = useState(data.name_place ?? "");
  const [address, setAddress] = useState(data.address ?? "");
  const [lat, setLat] = useState(data.lat?.toString() ?? "");
  const [lng, setLng] = useState(data.lng?.toString() ?? "");
  const [ticketUrl, setTicketUrl] = useState(data.ticket_url ?? "");
  const [price, setPrice] = useState(data.price ?? "");
  const [availability, setAvailability] = useState(data.availability ?? "");
  const [plot, setPlot] = useState(data.plot ?? data.description ?? "");
  const [regionId, setRegionId] = useState(data.region_id ?? "");
  const [actors, setActors] = useState<any[]>(Array.isArray(data.actors) ? data.actors : []);

  const parentRegions = regions.filter((r) => !r.parent_id);
  const childRegions = regions.filter((r) => r.parent_id);

  useImperativeHandle(ref, () => ({
    getData() {
      return {
        writer: writer || null,
        director: director || null,
        year: year ? parseInt(year) : null,
        name_place: namePlace || null,
        address: address || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        ticket_url: ticketUrl || null,
        price: price || null,
        availability: availability || null,
        plot: plot || null,
        region_id: regionId || null,
        dates: dates.length > 0 ? dates : null,
        actors: actors.length > 0 ? actors : null,
      };
    }
  }));

  return (
    <>
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

        {/* Single / Tour */}
        <div className="flex gap-3 mb-8">
          {(["single", "tour"] as const).map((t) => (
            <button key={t} onClick={() => setEventType(t)} className={`flex items-center gap-3 px-6 py-3 text-sm font-medium rounded-lg border-2 transition-colors ${eventType === t ? "border-zinc-900 text-zinc-900" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${eventType === t ? "border-zinc-900" : "border-zinc-300"}`}>
                {eventType === t && <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
              </span>
              {t === "single" ? "Single" : "Tour"}
            </button>
          ))}
        </div>

        {/* Writer / Director / Year */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <FieldInput label="Συγγραφέας" placeholder="Επιλογή Συγγραφέα" />
          <FieldInput label="Σκηνοθέτης" placeholder="Επιλογή Σκηνοθέτη" />
          <FieldInput label="Χρονιά" placeholder="3η χρονιά" />
        </div>

        {/* Map */}
        <AddressMapSection showPlace showActions />

        {/* Actors */}
        <SelectGrid label="Actors" placeholder="Επιλογή Ηθοποιού" count={8} />

        {/* Dates */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Dates</label>
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Διαθεσιμότητα</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">From</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">To</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-500">Price</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {dates.map((d, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-b-0">
                    <td className="px-4 py-2.5">
                      <select defaultValue={d.status} className="px-2 py-1.5 text-sm border border-zinc-200 rounded bg-white focus:outline-none focus:border-zinc-400">
                        {getOpts(extraOptions, "availability", ["Υψηλή", "Χαμηλή", "Εξαντλημένα"]).map((s) => (
                          <option key={s} value={s.toLowerCase()}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5"><input type="text" defaultValue={d.from} className="w-24 px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" /></td>
                    <td className="px-4 py-2.5"><input type="text" defaultValue={d.to} className="w-24 px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" /></td>
                    <td className="px-4 py-2.5"><input type="text" defaultValue={d.price} className="w-20 px-2 py-1.5 text-sm border border-zinc-200 rounded focus:outline-none focus:border-zinc-400" /></td>
                    <td className="px-4 py-2.5 text-right">
                      {dates.length > 1 && (
                        <button onClick={() => setDates((dd) => dd.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setDates((dd) => [...dd, { status: "high", from: "", to: "", price: "" }])} className="mt-3 flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-800">
            <PlusIcon /> Add Date
          </button>
        </div>

        {/* Ticket/Buy */}
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Ticket/Buy</label>
          <div className="flex items-center gap-3 p-4 border border-zinc-200 rounded-lg">
            <span className="text-sm font-bold text-emerald-600">Booking</span>
            <input type="text" defaultValue="https://www.booking.com/hosting-sr/foundex-antimensouldi.el.html" className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400" />
          </div>
        </div>
      </div>

      {/* ADS */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Ads</h2>
          <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
            <button onClick={() => setAdsActive(true)} className={`px-5 py-1.5 text-xs font-semibold transition-colors ${adsActive ? "bg-emerald-600 text-white" : "bg-white text-zinc-500"}`}>Active</button>
            <button onClick={() => setAdsActive(false)} className={`px-5 py-1.5 text-xs font-semibold transition-colors ${!adsActive ? "bg-zinc-900 text-white" : "bg-white text-zinc-500"}`}>Inactive</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-4">
            <FieldInput label="URL" placeholder="https://www.e-food.gr/delivery/lamprinica-group" />
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Κείμενο</label>
              <textarea placeholder="Κατεβάστε και τα φυσικήγεια τύπου..." className="w-full h-20 px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Buy</label>
              <div className="flex items-center gap-3 p-4 border border-zinc-200 rounded-lg">
                <span className="text-xl font-black text-orange-600 tracking-tight">Public</span>
                <input type="text" defaultValue="https://www.e-food.gr/delivery/lamprinica-group" className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400" />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Preview</label>
            <div className="border border-zinc-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-white">
                <div className="flex items-start gap-3">
                  <span className="text-lg font-black text-orange-600 shrink-0">Public</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">Ο Κωδικός Μπαντέρος</p>
                    <p className="text-xs text-zinc-500">και άλλες μπαρουκίτσες</p>
                  </div>
                </div>
              </div>
              <div className="w-full h-[140px] bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                Ad image preview
              </div>
              <div className="p-3 bg-zinc-50 text-center">
                <span className="text-sm font-semibold text-zinc-700">662.70€</span>
                <span className="text-xs text-zinc-500 ml-1">→</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

/* ─────────────── SHARED COMPONENTS ─────────────── */

function RegionSelect({ regionId, setRegionId, parentRegions, childRegions }: {
  regionId: string;
  setRegionId: (v: string) => void;
  parentRegions: { id: string; name: string; parent_id: string | null }[];
  childRegions: { id: string; name: string; parent_id: string | null }[];
}) {
  const selectedChild = childRegions.find((r) => r.id === regionId);
  const selectedParentId = selectedChild?.parent_id ?? (parentRegions.find((r) => r.id === regionId)?.id ?? "");

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Region</label>
        <select
          value={selectedParentId}
          onChange={(e) => setRegionId(e.target.value)}
          className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">Select Region</option>
          {parentRegions.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Area</label>
        <select
          value={regionId}
          onChange={(e) => setRegionId(e.target.value)}
          className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
        >
          <option value="">Select Area</option>
          {childRegions.filter((r) => r.parent_id === selectedParentId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
    </div>
  );
}

function AddressMapSection({ showPlace, showActions }: { showPlace?: boolean; showActions?: boolean }) {
  return (
    <div className="mb-6">
      {showPlace && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Place</label>
          <select className="w-[300px] px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Place</option></select>
        </div>
      )}

      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Address</label>
          <input type="text" placeholder="Enter address" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <div className="w-[120px]">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Latitude</label>
          <input type="text" placeholder="Lat" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <span className="pb-3 text-xs text-zinc-400 font-medium">OR</span>
        <div className="w-[120px]">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Longitude</label>
          <input type="text" placeholder="Lng" className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
        </div>
        <span className="pb-3 text-xs text-zinc-400 font-medium">OR</span>
        <button className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50 whitespace-nowrap shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
          Drag & Drop on the map
        </button>
      </div>

      <div className="w-full h-[300px] bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-400 text-sm">
        Map placeholder — connect Leaflet/Google Maps
      </div>

      {showActions && (
        <div className="flex gap-3 mt-4">
          <button className="px-6 py-2 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800">Save</button>
          <button className="px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50">Cancel</button>
        </div>
      )}
    </div>
  );
}

function SelectGrid({ label, placeholder, count }: { label: string; placeholder: string; count: number }) {
  return (
    <div className="mb-6">
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">{label}</label>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <select key={i} className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-500 bg-white"><option>{placeholder}</option></select>
        ))}
      </div>
    </div>
  );
}

function DeliveryRow({ name, color, placeholder }: { name: string; color: string; placeholder: string }) {
  return (
    <div className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg">
      <span className="text-sm font-extrabold w-14 shrink-0" style={{ color }}>{name}</span>
      <input type="text" placeholder={placeholder} className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
    </div>
  );
}

function PlotField() {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Plot</label>
      <textarea placeholder="Type your message here..." className="w-full h-28 px-4 py-3 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
    </div>
  );
}

function FieldInput({ label, placeholder, defaultValue }: { label: string; placeholder: string; defaultValue?: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <input type="text" placeholder={placeholder} defaultValue={defaultValue ?? ""} className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
    </div>
  );
}

function ToolbarIcon({ d }: { d: string }) {
  return (
    <button className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 rounded">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </button>
  );
}

function CalendarIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-400"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}

function PlusIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

function PenIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" /></svg>;
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>;
}

function ImagePlaceholderIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-zinc-400"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>;
}
