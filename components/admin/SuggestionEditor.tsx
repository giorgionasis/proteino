"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

type CategoryValue = string;

interface RatingDistribution {
  star: number;
  percentage: number;
}

interface SuggestionData {
  id: string;
  title: string;
  alias: string;
  category: CategoryValue;
  subcategory: string;
  isPublished: boolean;
  author: string;
  created: string;
  published: string;
  description: string;
  avgRating: number;
  totalRatings: number;
  totalReviews: number;
  distribution: RatingDistribution[];
}

const MOCK: SuggestionData = {
  id: "1",
  title: "Εκεί που τραγουδούν οι καραβίδες",
  alias: "ekei-pou-tragoudoun-oi-karavides",
  category: "movies",
  subcategory: "",
  isPublished: true,
  author: "George Nasis",
  created: "11:30:45  01/11/2024",
  published: "",
  description: "",
  avgRating: 4.71,
  totalRatings: 187,
  totalReviews: 45,
  distribution: [
    { star: 5, percentage: 80 },
    { star: 4, percentage: 10 },
    { star: 3, percentage: 0 },
    { star: 2, percentage: 6 },
    { star: 1, percentage: 4 },
  ],
};

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

const SUBCATEGORIES: Record<string, string[]> = {
  movies: ["Δράμα", "Κωμωδία", "Θρίλερ", "Δράση", "Sci-Fi", "Ρομαντική", "Animation", "Ντοκιμαντέρ", "Horror", "Βιογραφική"],
  series: ["Δράμα", "Κωμωδία", "Crime", "Sci-Fi", "Θρίλερ", "Ρομαντική", "Ντοκιμαντέρ", "Mini-series", "Animation"],
  books: ["Μυθιστόρημα", "Θρίλερ", "Sci-Fi", "Ιστορία", "Αυτοβιογραφία", "Ψυχολογία", "Φιλοσοφία", "Self-help", "Ποίηση", "Business", "Παιδικά"],
  recipes: ["Κυρίως Πιάτο", "Ορεκτικά", "Επιδόρπια", "Breakfast", "Ψητά", "Σαλάτες", "Σούπες", "Γλυκά", "Ψωμί & Ζύμες"],
  food: ["Ελληνική", "Ιταλική", "Ασιατική", "Burger", "Sushi", "Fine Dining", "Brunch", "Vegan", "Seafood", "Street Food", "Middle Eastern"],
  bars: ["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee", "Speakeasy", "Pub", "All-Day", "Sports Bar"],
  hotels: ["Αθήνα", "Κρήτη", "Θεσσαλονίκη", "Σαντορίνη", "Μύκονος", "Ρόδος", "Πελοπόννησος", "Χαλκιδική"],
  theater: ["Θέατρο", "Μιούζικαλ", "Stand-up", "Μονόπρακτο", "Παιδικό"],
  events: ["Συναυλία", "Festival", "Έκθεση", "Stand-up", "Workshop", "Sports"],
};

function getMediaConfig(category: string): { tabs: string[]; mode: "single" | "gallery" } {
  switch (category) {
    case "food": return { tabs: ["Εξωτερικά", "Εσωτερικά", "Πιάτα"], mode: "gallery" };
    case "bars": return { tabs: ["Εσωτερικά", "Εξωτερικά"], mode: "gallery" };
    case "hotels": return { tabs: ["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"], mode: "gallery" };
    case "theater": case "events": return { tabs: ["Landscape", "Trailer"], mode: "single" };
    default: return { tabs: ["Portrait", "Landscape", "Trailer"], mode: "single" };
  }
}

export function SuggestionEditor({ id }: { id: string }) {
  const [data, setData] = useState(MOCK);
  const [mediaTab, setMediaTab] = useState(0);

  function update<K extends keyof SuggestionData>(key: K, value: SuggestionData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  const mediaConfig = getMediaConfig(data.category);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/admin/suggestions" className="text-emerald-600 hover:underline font-medium">Suggestions</Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Επεξεργασία Πρότασης</span>
      </div>

      {/* Main card */}
      <div className="bg-white border border-zinc-200 rounded-xl p-8">
        <div className="flex gap-12">
          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Title</label>
              <input type="text" value={data.title} onChange={(e) => update("title", e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Alias</label>
              <input type="text" value={data.alias} onChange={(e) => update("alias", e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-500 focus:outline-none focus:border-zinc-400" />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Category</label>
                <select value={data.category} onChange={(e) => { update("category", e.target.value); setMediaTab(0); }} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">SELECT CATEGORY</option>
                  {CATEGORIES.map((c) => (<option key={c.slug} value={c.slug}>{c.labelEl}</option>))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Subcategory</label>
                <select value={data.subcategory} onChange={(e) => update("subcategory", e.target.value)} className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 bg-white">
                  <option value="">SELECT SUBCATEGORY</option>
                  {(SUBCATEGORIES[data.category] || []).map((sub) => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Publish</label>
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
                  <button onClick={() => update("isPublished", true)} className={`px-5 py-2 text-sm font-semibold transition-colors ${data.isPublished ? "bg-emerald-600 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}>YES</button>
                  <button onClick={() => update("isPublished", false)} className={`px-5 py-2 text-sm font-semibold transition-colors ${!data.isPublished ? "bg-zinc-900 text-white" : "bg-white text-zinc-500 hover:bg-zinc-50"}`}>NO</button>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Author</label>
                <select className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 bg-white"><option>George Nasis</option></select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Created</label>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600">
                  {data.created}
                  <CalendarIcon />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Published</label>
                <div className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-400">
                  DATE
                  <CalendarIcon />
                </div>
              </div>
            </div>
          </div>

          {/* Rating panel */}
          <div className="w-[220px] shrink-0">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-amber-500 text-xl">★</span>
              <span className="text-3xl font-bold text-zinc-800">{data.avgRating}</span>
            </div>
            <div className="flex gap-6 mb-4 text-sm text-zinc-500">
              <span><strong className="text-zinc-700">{data.totalRatings}</strong> ΒΑΘΜΟΛΟΓΙΕΣ</span>
              <span><strong className="text-zinc-700">{data.totalReviews}</strong> ΑΞΙΟΛΟΓΗΣΕΙΣ</span>
            </div>
            <div className="space-y-1.5">
              {data.distribution.map((d) => (
                <div key={d.star} className="flex items-center gap-2 text-sm">
                  <span className="w-3 text-zinc-500 text-right">{d.star}</span>
                  <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-zinc-800 rounded-full" style={{ width: `${d.percentage}%` }} />
                  </div>
                  <span className="w-10 text-right text-zinc-600 font-medium">{d.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-4">Description</h2>
        <div className="flex items-center gap-1 mb-3 pb-3 border-b border-zinc-200">
          <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded text-zinc-600 bg-white"><option>Heading</option><option>Paragraph</option></select>
          <div className="flex items-center gap-0.5 ml-2">
            {["B", "I", "U", "S"].map((btn) => (
              <button key={btn} className="w-8 h-8 flex items-center justify-center text-sm font-bold text-zinc-500 hover:bg-zinc-100 rounded">{btn}</button>
            ))}
          </div>
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolbarIcon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          <ToolbarIcon d="M4 6h16M4 12h10M4 18h14" />
          <div className="w-px h-5 bg-zinc-200 mx-1" />
          <ToolbarIcon d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
          <ToolbarIcon d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <ToolbarIcon d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </div>
        <textarea placeholder="Enter Text Here..." className="w-full h-40 px-4 py-3 text-sm text-zinc-700 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
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
      <ExtraFieldsSection category={data.category} />
    </div>
  );
}

/* ─────────────── ExtraFields Router ─────────────── */

function ExtraFieldsSection({ category }: { category: string }) {
  switch (category) {
    case "movies": return <MovieExtraFields />;
    case "books": return <BookExtraFields />;
    case "series": return <SeriesExtraFields />;
    case "food": return <FoodExtraFields />;
    case "bars": return <BarsExtraFields />;
    case "hotels": return <HotelExtraFields />;
    case "recipes": return <RecipeExtraFields />;
    case "theater": case "events": return <TheaterExtraFields />;
    default: return null;
  }
}

/* ─────────────── MOVIES ─────────────── */

function MovieExtraFields() {
  const [directors, setDirectors] = useState([""]);
  const [countries, setCountries] = useState([""]);
  const [actors, setActors] = useState(Array.from({ length: 8 }, () => ({ name: "", avatar: "" })));
  const [awards, setAwards] = useState<{ type: string; category: string; year: string }[]>([]);

  const addAward = (type: string) => setAwards((a) => [...a, { type, category: "", year: "" }]);

  const getAwardCategories = (type: string) => {
    switch (type) {
      case "Oscar": return OSCAR_CATEGORIES;
      case "BAFTA": return BAFTA_CATEGORIES;
      case "Golden Globe": return GOLDEN_GLOBE_CATEGORIES;
      case "Cannes": return CANNES_CATEGORIES;
      default: return [];
    }
  };

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <FieldInput label="YEAR" placeholder="2024" />
        <FieldInput label="DURATION" placeholder="127'" />

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
          {directors.map((_, i) => (
            <div key={i} className={`flex items-center gap-2 ${i > 0 ? "mt-2" : ""}`}>
              <input type="text" placeholder="Αναζήτηση σκηνοθέτη..." className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
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
          {["Based on true events", "Based on a book", "Remake", "Sequel", "Prequel", "Contains violence", "Contains sex", "Classic", "Independent film", "Black & White", "Foreign language", "Animated"].map((attr) => (
            <label key={attr} className="flex items-center gap-2 text-sm text-zinc-600 py-1">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {attr}
            </label>
          ))}
        </div>
      </div>

      <PlotField />

      <datalist id="countries-list">
        {COUNTRIES.map((c) => <option key={c} value={c} />)}
      </datalist>
    </div>
  );
}

/* ─────────────── BOOKS ─────────────── */

function BookExtraFields() {
  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <FieldInput label="AUTHOR" placeholder="Sebastian Fitzek" />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Editor</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Διόπτρα</option></select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Language</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Γερμανική</option><option>Ελληνικά</option><option>English</option></select>
        </div>
        <FieldInput label="PAGES" placeholder="432" />
        <FieldInput label="RELEASED" placeholder="2001" />
      </div>

      {/* Plot */}
      <div className="mb-6">
        <PlotField />
      </div>

      {/* Buy */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Buy</label>
        <div className="flex items-center gap-3 p-4 border border-zinc-200 rounded-lg">
          <span className="text-2xl font-black text-orange-600 tracking-tight">Public</span>
          <input type="text" defaultValue="https://www.e-food.gr/delivery/lamprinica-group" className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400" />
        </div>
      </div>

      {/* Author Info */}
      <div>
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Πληροφορίες Συγγραφέα</label>
        <div className="border border-zinc-200 rounded-xl p-6">
          <div className="flex gap-6">
            {/* Photo */}
            <div className="shrink-0">
              <div className="w-[100px] h-[100px] bg-zinc-100 rounded-full flex items-center justify-center border-2 border-dashed border-zinc-300">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-zinc-400"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </div>
              <button className="mt-2 text-xs text-emerald-600 hover:underline w-full text-center">Upload</button>
            </div>
            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <FieldInput label="Όνομα" placeholder="Sebastian Fitzek" />
                <FieldInput label="Ηλικία" placeholder="53" />
                <FieldInput label="Βιβλία" placeholder="32" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Βιογραφικό</label>
                <textarea placeholder="Σύντομο βιογραφικό συγγραφέα..." className="w-full h-20 px-3 py-2 text-sm border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── SERIES ─────────────── */

function SeriesExtraFields() {
  const [countries, setCountries] = useState([""]);

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Seasons</label>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <FieldInput label="No" placeholder="4" />
        <FieldInput label="RELEASED" placeholder="2022" />
        <FieldInput label="END" placeholder="" />
        <FieldInput label="INFO" placeholder="Σύντομα ξεκινάει ακόμη μια σεζόν" />
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Attributes</label>
        <div className="grid grid-cols-2 gap-2">
          {["Contain UFO", "Based on true events", "Contain SEX", "Series of one season", "Contain Religion", "Series is completed"].map((attr) => (
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
          {COUNTRIES.map((c) => <option key={c} value={c} />)}
        </datalist>
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Streaming</label>
        <div className="grid grid-cols-4 gap-3">
          {[
            { name: "Netflix", color: "#E50914", icon: "N" },
            { name: "Disney+", color: "#113CCF", icon: "D+" },
            { name: "Prime", color: "#00A8E1", icon: "P" },
            { name: "YouTube", color: "#FF0000", icon: "▶" },
          ].map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 rounded-lg">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: p.color }}>
                {p.icon}
              </div>
              <span className="text-xs font-medium text-zinc-600">{p.name}</span>
              <input type="text" placeholder="Χωρίς Τίτλο" className="w-full text-center text-xs border border-zinc-200 rounded px-1 py-1.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
            </div>
          ))}
        </div>
      </div>

      <SelectGrid label="Actors" placeholder="Επιλογή Ηθοποιού" count={8} />
      <SelectGrid label="Awards" placeholder="Επιλογή Βραβείου" count={8} />
      <PlotField />
    </div>
  );
}

/* ─────────────── FOOD / RESTAURANT ─────────────── */

function FoodExtraFields() {
  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Region</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Region</option></select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Area</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Area</option></select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <FieldInput label="Telephone" placeholder="211 303 4793" />
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
          {["Parking", "Wi-Fi", "Outdoor Seating", "Kid Friendly", "Pet Friendly", "Reservations", "Takeaway", "Delivery", "Live Music", "Accessible", "Smoking Area", "Credit Cards"].map((a) => (
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
          <DeliveryRow name="efood" color="#E23744" placeholder="https://www.e-food.gr/delivery/lamprinica-group/foods/ita" />
          <DeliveryRow name="Wolt" color="#009DE0" placeholder="https://wolt.com/el/grc/athens/restaurant/..." />
          <DeliveryRow name="Box" color="#00B140" placeholder="https://box.gr/delivery/restaurant/..." />
        </div>
      </div>
    </div>
  );
}

/* ─────────────── BARS / CAFES ─────────────── */

function BarsExtraFields() {
  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Region</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Region</option></select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Area</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Area</option></select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <FieldInput label="Telephone" placeholder="211 303 4793" />
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
          {["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee Shop", "Speakeasy", "Pub", "All-Day", "Sports Bar"].map((t) => (
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
          {["Parking", "Wi-Fi", "Outdoor Seating", "Live Music", "DJ", "Pet Friendly", "Reservations", "Smoking Area", "Accessible", "Credit Cards", "Happy Hour", "Late Night"].map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1">
              <input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />
              {a}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── HOTELS ─────────────── */

function HotelExtraFields() {
  const [availabilities, setAvailabilities] = useState([{ url: "https://www.booking.com/hotel/..." }]);

  return (
    <div className="mt-6 bg-white border border-zinc-200 rounded-xl p-8">
      <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide mb-6">ExtraFields</h2>

      <AddressMapSection />

      {/* Region / Area */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Region</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Region</option></select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Area</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Select Area</option></select>
        </div>
      </div>

      {/* Contact */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <FieldInput label="TELEPHONE" placeholder="211 303 4793" />
        <FieldInput label="INFORMATION" placeholder="https://www.facebook.com/r-diadrom" />
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">Source</label>
          <select className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white"><option>Facebook</option><option>Website</option></select>
        </div>
      </div>

      {/* Type */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Type</label>
        <div className="flex gap-3">
          {["Διαμέρισμα", "Δωμάτιο", "Camping", "Μονοκατοικία", "Ξενοδοχείο"].map((t) => (
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
          {["Pool", "Bar", "Restaurant", "Parking", "Breakfast"].map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1"><input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />{a}</label>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Δωμάτιο</label>
          {["Sea view", "Mountain View", "Wifi"].map((a) => (
            <label key={a} className="flex items-center gap-2 text-sm text-zinc-600 py-1"><input type="checkbox" className="w-4 h-4 rounded border-zinc-300" />{a}</label>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Extra</label>
          {["Pet Friendly", "Disabilities", "Transfer"].map((a) => (
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
}

/* ─────────────── RECIPES ─────────────── */

function RecipeExtraFields() {
  const [ingredients, setIngredients] = useState([
    { qty: "2", unit: "κούπα", name: "αλεύρι ζαχαρι", link: "" },
    { qty: "1", unit: "κούπα", name: "βούτυρο", link: "" },
    { qty: "4", unit: "τεμ", name: "αυγά", link: "" },
    { qty: "1", unit: "κούπα", name: "γάλα", link: "" },
  ]);
  const [steps, setSteps] = useState(["", "", "", ""]);
  const [tips, setTips] = useState(["", ""]);

  const UNITS = ["κ.γ.", "κ.σ.", "κούπα", "κούπες", "γρ.", "κιλό", "ml", "lt", "τεμ", "φέτες", "ματσάκι"];

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
          <option value="αλεύρι" /><option value="ζάχαρη" /><option value="βούτυρο" /><option value="αυγά" /><option value="γάλα" /><option value="αλάτι" /><option value="πιπέρι" /><option value="ελαιόλαδο" /><option value="κρεμμύδι" /><option value="σκόρδο" />
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
            <option>Easy</option><option>Medium</option><option>Hard</option>
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
        <div className="flex gap-4">
          {["Vegan", "Milk", "Sugar", "Gluten Free", "Nut Free"].map((n) => (
            <label key={n} className="flex items-center gap-1.5 text-xs text-zinc-600">
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-zinc-300" />
              {n}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────── THEATER / EVENTS ─────────────── */

function TheaterExtraFields() {
  const [eventType, setEventType] = useState<"single" | "tour">("single");
  const [adsActive, setAdsActive] = useState(false);
  const [dates, setDates] = useState([
    { status: "high", from: "10/03/25", to: "15/03/25", price: "25€" },
    { status: "low", from: "18/03/25", to: "22/03/25", price: "30€" },
  ]);

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
                        <option value="high">Υψηλή</option>
                        <option value="low">Χαμηλή</option>
                        <option value="soldout">Εξαντλημένα</option>
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
}

/* ─────────────── SHARED COMPONENTS ─────────────── */

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

function FieldInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{label}</label>}
      <input type="text" placeholder={placeholder} defaultValue={placeholder} className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400" />
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
