"use client";

import { useState } from "react";

const CATEGORY_TABS = [
  { label: "Ταινίες", value: "movies" },
  { label: "Σειρές", value: "series" },
  { label: "Βιβλία", value: "books" },
  { label: "Φαγητό", value: "food" },
  { label: "Καφέ/Μπαρ", value: "bars" },
  { label: "Συνταγές", value: "recipes" },
  { label: "Διαμονή", value: "hotels" },
  { label: "Θέατρο", value: "theater" },
  { label: "Εκδηλώσεις", value: "events" },
];

interface AttributeDef {
  id: string;
  name: string;
  type: "dropdown" | "checkbox" | "range";
  values: string[];
}

interface FilterConfig {
  attributeId: string;
  isQuickFilter: boolean;
  isBottomSheet: boolean;
  order: number;
}

const ATTRIBUTES_BY_CATEGORY: Record<string, AttributeDef[]> = {
  movies: [
    { id: "genre", name: "Είδος", type: "dropdown", values: ["Δράμα", "Κωμωδία", "Θρίλερ", "Δράση", "Sci-Fi", "Ρομαντική", "Animation", "Ντοκιμαντέρ", "Horror", "Βιογραφική"] },
    { id: "country", name: "Χώρα", type: "dropdown", values: ["ΗΠΑ", "Ελλάδα", "Γαλλία", "Ηνωμένο Βασίλειο", "Γερμανία", "Ιταλία", "Ισπανία", "Ιαπωνία", "Κορέα (Νότια)"] },
    { id: "year", name: "Εποχή", type: "range", values: ["2020-2024", "2010-2019", "2000-2009", "1990-1999", "1980-1989", "Πριν το 1980"] },
    { id: "platform", name: "Πλατφόρμα", type: "dropdown", values: ["Netflix", "Disney+", "HBO Max", "Apple TV+", "Amazon Prime", "Viaplay"] },
    { id: "duration", name: "Διάρκεια", type: "range", values: ["<90'", "90-120'", "120-150'", ">150'"] },
    { id: "awards", name: "Βραβεία", type: "dropdown", values: ["Oscar", "BAFTA", "Golden Globe", "Cannes", "Venice"] },
    { id: "attr_trueEvents", name: "Αληθινά γεγονότα", type: "checkbox", values: ["Ναι"] },
    { id: "attr_classic", name: "Classic", type: "checkbox", values: ["Ναι"] },
    { id: "attr_basedOnBook", name: "Βασισμένη σε βιβλίο", type: "checkbox", values: ["Ναι"] },
    { id: "attr_bw", name: "Ασπρόμαυρη", type: "checkbox", values: ["Ναι"] },
  ],
  series: [
    { id: "genre", name: "Είδος", type: "dropdown", values: ["Δράμα", "Κωμωδία", "Crime", "Sci-Fi", "Θρίλερ", "Ρομαντική", "Ντοκιμαντέρ", "Mini-series", "Animation"] },
    { id: "country", name: "Χώρα", type: "dropdown", values: ["ΗΠΑ", "Ελλάδα", "Ηνωμένο Βασίλειο", "Κορέα (Νότια)", "Ιαπωνία", "Σκανδιναβία"] },
    { id: "platform", name: "Πλατφόρμα", type: "dropdown", values: ["Netflix", "Disney+", "HBO Max", "Apple TV+", "Amazon Prime"] },
    { id: "seasons", name: "Σεζόν", type: "range", values: ["1", "2-3", "4-6", "7+"] },
    { id: "status", name: "Κατάσταση", type: "dropdown", values: ["Σε εξέλιξη", "Ολοκληρωμένη", "Ακυρωμένη"] },
    { id: "attr_trueEvents", name: "Αληθινά γεγονότα", type: "checkbox", values: ["Ναι"] },
    { id: "attr_oneSeason", name: "Μία σεζόν", type: "checkbox", values: ["Ναι"] },
  ],
  books: [
    { id: "genre", name: "Είδος", type: "dropdown", values: ["Μυθιστόρημα", "Θρίλερ", "Sci-Fi", "Ιστορία", "Αυτοβιογραφία", "Ψυχολογία", "Φιλοσοφία", "Self-help", "Ποίηση", "Business", "Παιδικά"] },
    { id: "language", name: "Γλώσσα", type: "dropdown", values: ["Ελληνικά", "Αγγλικά", "Γαλλικά", "Γερμανικά", "Ισπανικά"] },
    { id: "pages", name: "Σελίδες", type: "range", values: ["<200", "200-400", "400-600", ">600"] },
    { id: "year", name: "Χρονιά έκδοσης", type: "range", values: ["2020-2024", "2010-2019", "2000-2009", "Πριν το 2000"] },
  ],
  food: [
    { id: "cuisine", name: "Κουζίνα", type: "dropdown", values: ["Ελληνική", "Ιταλική", "Ασιατική", "Burger", "Sushi", "Fine Dining", "Brunch", "Vegan", "Seafood", "Street Food"] },
    { id: "region", name: "Περιοχή", type: "dropdown", values: ["Αθήνα Κέντρο", "Βόρεια Προάστια", "Νότια Προάστια", "Πειραιάς", "Θεσσαλονίκη"] },
    { id: "price", name: "Τιμή", type: "range", values: ["€", "€€", "€€€", "€€€€"] },
    { id: "delivery", name: "Delivery", type: "dropdown", values: ["efood", "Wolt", "Box"] },
    { id: "attr_parking", name: "Parking", type: "checkbox", values: ["Ναι"] },
    { id: "attr_outdoor", name: "Εξωτερικός χώρος", type: "checkbox", values: ["Ναι"] },
    { id: "attr_kidFriendly", name: "Kid Friendly", type: "checkbox", values: ["Ναι"] },
    { id: "attr_petFriendly", name: "Pet Friendly", type: "checkbox", values: ["Ναι"] },
  ],
  bars: [
    { id: "type", name: "Τύπος", type: "dropdown", values: ["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee", "Speakeasy", "Pub", "All-Day", "Sports Bar"] },
    { id: "region", name: "Περιοχή", type: "dropdown", values: ["Αθήνα Κέντρο", "Κολωνάκι", "Γκάζι", "Ψυρρή", "Θεσσαλονίκη"] },
    { id: "price", name: "Τιμή", type: "range", values: ["€", "€€", "€€€"] },
    { id: "attr_liveMusic", name: "Live Music", type: "checkbox", values: ["Ναι"] },
    { id: "attr_outdoor", name: "Εξωτερικός χώρος", type: "checkbox", values: ["Ναι"] },
    { id: "attr_lateNight", name: "Late Night", type: "checkbox", values: ["Ναι"] },
  ],
  recipes: [
    { id: "type", name: "Τύπος", type: "dropdown", values: ["Κυρίως Πιάτο", "Ορεκτικά", "Επιδόρπια", "Breakfast", "Ψητά", "Σαλάτες", "Σούπες", "Γλυκά", "Ψωμί & Ζύμες"] },
    { id: "level", name: "Δυσκολία", type: "dropdown", values: ["Easy", "Medium", "Hard"] },
    { id: "duration", name: "Χρόνος", type: "range", values: ["<30'", "30-60'", "60-120'", ">120'"] },
    { id: "nutrition", name: "Διατροφή", type: "dropdown", values: ["Vegan", "Χωρίς γάλα", "Χωρίς ζάχαρη", "Gluten Free", "Nut Free"] },
  ],
  hotels: [
    { id: "destination", name: "Προορισμός", type: "dropdown", values: ["Αθήνα", "Κρήτη", "Θεσσαλονίκη", "Σαντορίνη", "Μύκονος", "Ρόδος", "Πελοπόννησος"] },
    { id: "type", name: "Τύπος", type: "dropdown", values: ["Ξενοδοχείο", "Διαμέρισμα", "Δωμάτιο", "Camping", "Μονοκατοικία"] },
    { id: "price", name: "Τιμή/νύχτα", type: "range", values: ["<50€", "50-100€", "100-200€", ">200€"] },
    { id: "stars", name: "Αστέρια", type: "range", values: ["1★", "2★", "3★", "4★", "5★"] },
    { id: "attr_pool", name: "Πισίνα", type: "checkbox", values: ["Ναι"] },
    { id: "attr_seaview", name: "Sea View", type: "checkbox", values: ["Ναι"] },
    { id: "attr_petFriendly", name: "Pet Friendly", type: "checkbox", values: ["Ναι"] },
    { id: "attr_breakfast", name: "Πρωινό", type: "checkbox", values: ["Ναι"] },
  ],
  theater: [
    { id: "type", name: "Τύπος", type: "dropdown", values: ["Θέατρο", "Μιούζικαλ", "Stand-up", "Μονόπρακτο", "Παιδικό"] },
    { id: "city", name: "Πόλη", type: "dropdown", values: ["Αθήνα", "Θεσσαλονίκη", "Πάτρα", "Ηράκλειο"] },
    { id: "price", name: "Τιμή", type: "range", values: ["<15€", "15-30€", "30-50€", ">50€"] },
    { id: "availability", name: "Διαθεσιμότητα", type: "dropdown", values: ["Υψηλή", "Χαμηλή", "Εξαντλημένα"] },
  ],
  events: [
    { id: "type", name: "Τύπος", type: "dropdown", values: ["Συναυλία", "Festival", "Έκθεση", "Stand-up", "Workshop", "Sports"] },
    { id: "city", name: "Πόλη", type: "dropdown", values: ["Αθήνα", "Θεσσαλονίκη", "Πάτρα", "Ηράκλειο"] },
    { id: "price", name: "Τιμή", type: "range", values: ["Δωρεάν", "<20€", "20-50€", ">50€"] },
    { id: "date", name: "Ημερομηνία", type: "range", values: ["Σήμερα", "Αυτή την εβδομάδα", "Αυτό τον μήνα", "Επόμενος μήνας"] },
  ],
};

const MOCK_COUNTS: Record<string, Record<string, number>> = {
  movies: { "Δράμα": 42, "Κωμωδία": 35, "Θρίλερ": 28, "Δράση": 19, "Sci-Fi": 15, "Ρομαντική": 22, "Animation": 8, "Ντοκιμαντέρ": 12, "Horror": 11, "Βιογραφική": 7 },
  series: { "Δράμα": 31, "Κωμωδία": 18, "Crime": 24, "Sci-Fi": 9, "Θρίλερ": 14, "Ρομαντική": 7, "Ντοκιμαντέρ": 5, "Mini-series": 11, "Animation": 4 },
  books: { "Μυθιστόρημα": 56, "Θρίλερ": 23, "Sci-Fi": 12, "Ιστορία": 8, "Αυτοβιογραφία": 6, "Ψυχολογία": 14, "Φιλοσοφία": 5, "Self-help": 19, "Ποίηση": 3, "Business": 7, "Παιδικά": 4 },
};

const INITIAL_CONFIGS: Record<string, FilterConfig[]> = {
  movies: [
    { attributeId: "genre", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "platform", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "year", isQuickFilter: false, isBottomSheet: true, order: 3 },
    { attributeId: "country", isQuickFilter: false, isBottomSheet: true, order: 4 },
  ],
  series: [
    { attributeId: "genre", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "platform", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "status", isQuickFilter: false, isBottomSheet: true, order: 3 },
  ],
  books: [
    { attributeId: "genre", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "language", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "pages", isQuickFilter: false, isBottomSheet: true, order: 3 },
  ],
  food: [
    { attributeId: "cuisine", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "region", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "price", isQuickFilter: true, isBottomSheet: true, order: 3 },
  ],
  bars: [
    { attributeId: "type", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "region", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "price", isQuickFilter: false, isBottomSheet: true, order: 3 },
  ],
  recipes: [
    { attributeId: "type", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "level", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "duration", isQuickFilter: false, isBottomSheet: true, order: 3 },
  ],
  hotels: [
    { attributeId: "destination", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "type", isQuickFilter: false, isBottomSheet: true, order: 2 },
    { attributeId: "price", isQuickFilter: true, isBottomSheet: true, order: 3 },
    { attributeId: "stars", isQuickFilter: false, isBottomSheet: true, order: 4 },
  ],
  theater: [
    { attributeId: "type", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "city", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "price", isQuickFilter: false, isBottomSheet: true, order: 3 },
  ],
  events: [
    { attributeId: "type", isQuickFilter: true, isBottomSheet: true, order: 1 },
    { attributeId: "city", isQuickFilter: true, isBottomSheet: true, order: 2 },
    { attributeId: "date", isQuickFilter: true, isBottomSheet: true, order: 3 },
  ],
};

export function FiltersManager() {
  const [activeCategory, setActiveCategory] = useState("movies");
  const [configs, setConfigs] = useState(INITIAL_CONFIGS);
  const [explorerFilters, setExplorerFilters] = useState<Record<string, string>>({});

  const attributes = ATTRIBUTES_BY_CATEGORY[activeCategory] || [];
  const categoryConfigs = configs[activeCategory] || [];

  const toggleFilter = (attributeId: string, field: "isQuickFilter" | "isBottomSheet") => {
    setConfigs((prev) => {
      const existing = prev[activeCategory] || [];
      const idx = existing.findIndex((c) => c.attributeId === attributeId);
      if (idx >= 0) {
        const updated = [...existing];
        updated[idx] = { ...updated[idx], [field]: !updated[idx][field] };
        if (!updated[idx].isQuickFilter && !updated[idx].isBottomSheet) {
          updated.splice(idx, 1);
        }
        return { ...prev, [activeCategory]: updated };
      } else {
        return {
          ...prev,
          [activeCategory]: [...existing, { attributeId, [field]: true, isQuickFilter: field === "isQuickFilter", isBottomSheet: field === "isBottomSheet", order: existing.length + 1 }],
        };
      }
    });
  };

  const getConfig = (attributeId: string): FilterConfig | undefined =>
    categoryConfigs.find((c) => c.attributeId === attributeId);

  const totalSuggestions = Object.values(MOCK_COUNTS[activeCategory] || {}).reduce((a, b) => a + b, 0);

  const matchingCount = () => {
    const activeFilters = Object.entries(explorerFilters).filter(([, v]) => v !== "");
    if (activeFilters.length === 0) return totalSuggestions;
    let count = totalSuggestions;
    for (const [, val] of activeFilters) {
      const specific = (MOCK_COUNTS[activeCategory] || {})[val];
      if (specific) count = specific;
    }
    return count;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-zinc-800">Filters</h1>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 border-b border-zinc-200 mb-8 overflow-x-auto">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setActiveCategory(tab.value); setExplorerFilters({}); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              activeCategory === tab.value
                ? "text-zinc-900 font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* LEFT: Explorer */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Explorer</h2>
            <span className="px-2.5 py-0.5 bg-zinc-100 rounded-full text-xs font-bold text-zinc-600">
              {matchingCount()} προτάσεις
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Φιλτράρισε κατά attribute για να δεις πόσες προτάσεις ταιριάζουν — βοηθάει στην απόφαση Card ή Carousel.</p>

          <div className="border border-zinc-200 rounded-xl p-5 space-y-4">
            {attributes.filter((a) => a.type === "dropdown" || a.type === "range").map((attr) => (
              <div key={attr.id}>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1.5">{attr.name}</label>
                <select
                  value={explorerFilters[attr.id] || ""}
                  onChange={(e) => setExplorerFilters((f) => ({ ...f, [attr.id]: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400"
                >
                  <option value="">Όλα</option>
                  {attr.values.map((v) => (
                    <option key={v} value={v}>
                      {v} {(MOCK_COUNTS[activeCategory] || {})[v] ? `(${(MOCK_COUNTS[activeCategory] || {})[v]})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {attributes.filter((a) => a.type === "checkbox").map((attr) => (
              <label key={attr.id} className="flex items-center gap-2 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={explorerFilters[attr.id] === "true"}
                  onChange={(e) => setExplorerFilters((f) => ({ ...f, [attr.id]: e.target.checked ? "true" : "" }))}
                  className="w-4 h-4 rounded border-zinc-300"
                />
                {attr.name}
              </label>
            ))}
          </div>

          {/* Result preview */}
          <div className="mt-4 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-700">Αποτελέσματα:</span>
              <span className="text-2xl font-bold text-zinc-800">{matchingCount()}</span>
            </div>
            <div className="flex gap-2">
              <div className={`px-3 py-1.5 rounded text-xs font-medium ${matchingCount() > 10 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                {matchingCount() > 10 ? "✓ Card" : "— Card (>10)"}
              </div>
              <div className={`px-3 py-1.5 rounded text-xs font-medium ${matchingCount() >= 4 && matchingCount() <= 10 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                {matchingCount() >= 4 && matchingCount() <= 10 ? "✓ Carousel" : "— Carousel (4-10)"}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Frontend Filter Config */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-wide">Frontend Filters</h2>
            <span className="px-2.5 py-0.5 bg-emerald-100 rounded-full text-xs font-bold text-emerald-700">
              {categoryConfigs.filter((c) => c.isQuickFilter).length} quick
            </span>
            <span className="px-2.5 py-0.5 bg-blue-100 rounded-full text-xs font-bold text-blue-700">
              {categoryConfigs.filter((c) => c.isBottomSheet).length} bottom sheet
            </span>
          </div>
          <p className="text-xs text-zinc-500 mb-4">Επίλεξε ποια attributes θα βλέπει ο χρήστης ως φίλτρα. Quick = εμφανίζεται σαν chip, Bottom Sheet = μέσα στο ⊞ Φίλτρα panel.</p>

          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Attribute</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase">Τύπος</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Quick Filter</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase">Bottom Sheet</th>
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr) => {
                  const config = getConfig(attr.id);
                  return (
                    <tr key={attr.id} className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-sm font-medium text-zinc-800">{attr.name}</span>
                        <span className="ml-2 text-xs text-zinc-400">({attr.values.length})</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          attr.type === "dropdown" ? "bg-blue-50 text-blue-600" :
                          attr.type === "range" ? "bg-amber-50 text-amber-600" :
                          "bg-zinc-100 text-zinc-600"
                        }`}>
                          {attr.type}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleFilter(attr.id, "isQuickFilter")}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            config?.isQuickFilter
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-200 text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          {config?.isQuickFilter && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => toggleFilter(attr.id, "isBottomSheet")}
                          className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-colors ${
                            config?.isBottomSheet
                              ? "border-blue-500 bg-blue-500 text-white"
                              : "border-zinc-200 text-zinc-300 hover:border-zinc-300"
                          }`}
                        >
                          {config?.isBottomSheet && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Preview of how it looks on frontend */}
          <div className="mt-6 border border-zinc-200 rounded-xl p-5 bg-zinc-50/50">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Frontend Preview</label>

            {/* Quick filters row */}
            <div className="mb-3">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase mb-1 block">Quick Filters (chips)</span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1.5 bg-zinc-200 rounded-full text-xs font-medium text-zinc-700 flex items-center gap-1">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /></svg>
                  Φίλτρα
                </span>
                {categoryConfigs.filter((c) => c.isQuickFilter).map((c) => {
                  const attr = attributes.find((a) => a.id === c.attributeId);
                  if (!attr) return null;
                  return (
                    <span key={c.attributeId} className="px-3 py-1.5 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-600">
                      {attr.name} ▾
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom sheet contents */}
            <div>
              <span className="text-[10px] font-semibold text-zinc-400 uppercase mb-1 block">Bottom Sheet (⊞ Φίλτρα panel)</span>
              <div className="flex flex-wrap gap-1.5">
                {categoryConfigs.filter((c) => c.isBottomSheet).map((c) => {
                  const attr = attributes.find((a) => a.id === c.attributeId);
                  if (!attr) return null;
                  return (
                    <span key={c.attributeId} className="px-2.5 py-1 bg-white border border-zinc-200 rounded text-xs text-zinc-600">
                      {attr.name}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Save */}
          <div className="mt-4 flex justify-end">
            <button className="px-6 py-2.5 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors">
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
