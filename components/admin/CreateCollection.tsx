"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

type CollectionType = "card" | "carousel" | null;
type Step = 1 | 2 | 3;

export function CreateCollection() {
  const [step, setStep] = useState<Step>(1);
  const [selectedType, setSelectedType] = useState<CollectionType>(null);

  // Step 2 — placement
  const [showInCategories, setShowInCategories] = useState(false);
  const [showInSuggestions, setShowInSuggestions] = useState(false);
  const [categoryPlacements, setCategoryPlacements] = useState<string[]>([]);

  // Step 3 — details
  const [titleGeneral, setTitleGeneral] = useState("");
  const [titleSpecific, setTitleSpecific] = useState("");
  const [alias, setAlias] = useState("");
  const [extraFieldRows, setExtraFieldRows] = useState([{ category: "", field: "", value: "" }]);

  function handleTitleChange(value: string) {
    setTitleGeneral(value);
    const combined = `${value} ${titleSpecific}`.trim();
    setAlias(
      combined
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
    );
  }

  function addExtraFieldRow() {
    setExtraFieldRows((rows) => [...rows, { category: "", field: "", value: "" }]);
  }

  function canGoNext() {
    if (step === 1) return selectedType !== null;
    if (step === 2) return showInCategories || showInSuggestions;
    return true;
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/admin/content/collections" className="text-emerald-600 hover:underline font-medium underline">
          Collections
        </Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-600">Create Collection</span>
      </div>

      {/* Step 1 — Type selection */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-zinc-800 mb-6 text-center">Είδος συλλογής</h2>

          <div className="flex gap-6 max-w-[720px] mx-auto">
            {/* Card */}
            <button
              onClick={() => setSelectedType("card")}
              className={`flex-1 text-left p-6 border-2 rounded-xl transition-colors ${
                selectedType === "card" ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-zinc-800">Card</h3>
                <RadioDot selected={selectedType === "card"} />
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                Περιλαμβάνει πάνω από 10 προτάσεις και θα εμφανίζεται όπως παρακάτω
              </p>
              <div className="bg-zinc-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-sm font-bold text-zinc-800">Καλύτερης Ταινίας</p>
                    <p className="text-xs text-zinc-500">Όσκαρ</p>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 mt-2">Ταινίες που έχουν κερδίσει όσκαρ καλύτερης ταινίας</p>
              </div>
            </button>

            <div className="flex items-center text-zinc-400 text-sm font-medium">ή</div>

            {/* Carousel */}
            <button
              onClick={() => setSelectedType("carousel")}
              className={`flex-1 text-left p-6 border-2 rounded-xl transition-colors ${
                selectedType === "carousel" ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-zinc-800">Carousel</h3>
                <RadioDot selected={selectedType === "carousel"} />
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                Περιλαμβάνει από 4 έως 10 προτάσεις και θα εμφανίζεται όπως παρακάτω
              </p>
              <div>
                <p className="text-xs font-semibold text-zinc-700 mb-2">Διαθέσιμες online</p>
                <div className="flex gap-2 overflow-hidden">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-[70px] shrink-0">
                      <div className="w-full h-[100px] bg-zinc-200 rounded mb-1" />
                      <p className="text-[10px] text-zinc-600 font-medium">Oppenheimer</p>
                      <p className="text-[9px] text-zinc-400">Δράμα</p>
                      <p className="text-[9px] text-zinc-400">★ 4.74 (123 αξιολογήσεις)</p>
                    </div>
                  ))}
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Placement */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-zinc-800 mb-2">Που θα εμφανίζεται</h2>
          <p className="text-sm text-zinc-500 mb-8">Η ίδια συλλογή μπορεί να προβάλλεται μέσα σε κατηγορίες και προτάσεις ταυτόχρονα</p>

          <div className="flex gap-6 max-w-[720px] mx-auto">
            {/* Σε Κατηγορίες */}
            <button
              onClick={() => setShowInCategories(!showInCategories)}
              className={`flex-1 text-left p-6 border-2 rounded-xl transition-colors ${
                showInCategories ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-zinc-800">Σε Κατηγορίες</h3>
                <CheckBox checked={showInCategories} />
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                Η συλλογή θα εμφανίζεται μέσα στις παρακάτω κατηγορίες:
              </p>
              <select
                className="px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-700 bg-white focus:outline-none focus:border-zinc-400"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val && !categoryPlacements.includes(val)) {
                    setCategoryPlacements([...categoryPlacements, val]);
                  }
                }}
              >
                <option value="">Επιλογή κατηγοριών</option>
                <option value="Αρχική">Αρχική</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.labelEl}>{c.labelEl}</option>
                ))}
              </select>
              {categoryPlacements.length > 0 && (
                <p className="text-sm text-zinc-700 font-medium mt-2">
                  {categoryPlacements.join(", ")}
                </p>
              )}
            </button>

            {/* Σε Προτάσεις */}
            <button
              onClick={() => setShowInSuggestions(!showInSuggestions)}
              className={`flex-1 text-left p-6 border-2 rounded-xl transition-colors ${
                showInSuggestions ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-bold text-zinc-800">Σε Προτάσεις</h3>
                <CheckBox checked={showInSuggestions} />
              </div>
              <p className="text-sm text-zinc-500 mb-4">
                Η συλλογή θα εμφανίζεται μέσα στις προτάσεις των κατηγοριών:
              </p>
              <select className="px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white focus:outline-none focus:border-zinc-400">
                <option>Επιλογή κατηγοριών</option>
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.labelEl}</option>
                ))}
              </select>
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Details */}
      {step === 3 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-zinc-800">
              {selectedType === "card" ? "Card" : "Carousel"}:{" "}
              <span className="text-emerald-600 font-medium">{categoryPlacements.join(", ") || "Αρχική"}</span>
            </h2>
            <button onClick={() => {}} className="text-zinc-400 hover:text-zinc-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex gap-10">
            {/* Left — form */}
            <div className="w-[300px] space-y-5">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Τίτλος</label>
                {selectedType === "card" && (
                  <>
                    <label className="block text-xs text-zinc-500 mb-1">Γενικό</label>
                    <input
                      type="text"
                      value={titleGeneral}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      placeholder="Από το σύμπαν"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400 mb-3"
                    />
                    <label className="block text-xs text-zinc-500 mb-1">Ειδικό</label>
                    <input
                      type="text"
                      value={titleSpecific}
                      onChange={(e) => setTitleSpecific(e.target.value)}
                      placeholder="της MARVEL"
                      className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
                    />
                  </>
                )}
                {selectedType === "carousel" && (
                  <input
                    type="text"
                    value={titleGeneral}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Netflix: 1 Σεζόν"
                    className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-800 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-400"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">Alias</label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-500 focus:outline-none focus:border-zinc-400"
                />
              </div>

              {selectedType === "card" && (
                <div>
                  <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center gap-2 text-zinc-400 hover:border-zinc-300 cursor-pointer">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-emerald-500">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                      <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="19" cy="19" r="4" fill="currentColor" stroke="white" strokeWidth="2" />
                      <path d="M19 17.5v3M17.5 19h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm">Προσθήκη Εικόνας</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right — extra fields + preview */}
            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-3">Extra Field</label>
                <div className="space-y-3">
                  {extraFieldRows.map((row, i) => (
                    <div key={i} className="flex gap-2">
                      <select
                        value={row.category}
                        onChange={(e) => {
                          const newRows = [...extraFieldRows];
                          newRows[i] = { ...newRows[i], category: e.target.value };
                          setExtraFieldRows(newRows);
                        }}
                        className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white min-w-[120px]"
                      >
                        <option value="">Κατηγορία</option>
                        {CATEGORIES.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.labelEl}</option>
                        ))}
                      </select>
                      <select
                        value={row.field}
                        onChange={(e) => {
                          const newRows = [...extraFieldRows];
                          newRows[i] = { ...newRows[i], field: e.target.value };
                          setExtraFieldRows(newRows);
                        }}
                        className="px-3 py-2.5 border border-zinc-200 rounded-lg text-sm text-zinc-600 bg-white min-w-[140px]"
                      >
                        <option value="">Field</option>
                        <option value="theme">Θέμα</option>
                        <option value="streaming">Streaming</option>
                        <option value="characteristics">Χαρακτηριστικά</option>
                        <option value="awards">Awards</option>
                      </select>
                      <select
                        value={row.value}
                        onChange={(e) => {
                          const newRows = [...extraFieldRows];
                          newRows[i] = { ...newRows[i], value: e.target.value };
                          setExtraFieldRows(newRows);
                        }}
                        className={`px-3 py-2.5 border rounded-lg text-sm bg-white min-w-[120px] ${
                          row.value ? "border-emerald-500 text-emerald-700" : "border-zinc-200 text-zinc-600"
                        }`}
                      >
                        <option value="">Value</option>
                        <option value="Marvel">Marvel</option>
                        <option value="Netflix">Netflix</option>
                        <option value="1 Σεζόν">1 Σεζόν</option>
                      </select>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addExtraFieldRow}
                  className="flex items-center gap-2 mt-3 px-4 py-2 text-sm text-zinc-600 border border-zinc-200 rounded-full hover:bg-zinc-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Νέα τιμή
                </button>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-3">Προεπισκόπηση</label>
                {selectedType === "card" ? (
                  <div className="inline-flex items-center gap-3 p-4 border border-zinc-200 rounded-lg">
                    <div className="w-12 h-12 bg-zinc-200 rounded flex items-center justify-center text-xs font-bold text-zinc-500">IMG</div>
                    <div>
                      <p className="text-sm text-zinc-700">
                        {titleGeneral || "Από το σύμπαν"}{" "}
                        <strong>{titleSpecific || "της MARVEL"}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-zinc-700 mb-2">{titleGeneral || "Netflix: 1 Σεζόν"}</p>
                    <div className="flex gap-2 overflow-hidden">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="w-[80px] h-[120px] bg-zinc-200 rounded shrink-0" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t border-zinc-200">
        {step > 1 ? (
          <button
            onClick={() => setStep((s) => (s - 1) as Step)}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-lg hover:bg-zinc-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            {step === 3 ? "Προηγούμενο" : "Previous"}
          </button>
        ) : (
          <div />
        )}

        {step < 3 ? (
          <button
            onClick={() => canGoNext() && setStep((s) => (s + 1) as Step)}
            disabled={!canGoNext()}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        ) : (
          <button className="px-8 py-2.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800">
            Αποθήκευση
          </button>
        )}
      </div>
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? "border-zinc-900" : "border-zinc-300"}`}>
      {selected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-900" />}
    </div>
  );
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <div className={`w-5 h-5 rounded flex items-center justify-center ${checked ? "bg-zinc-900" : "border-2 border-zinc-300"}`}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
    </div>
  );
}
