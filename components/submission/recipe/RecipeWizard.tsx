"use client";

import { useState, useEffect } from "react";
import { IngredientList, type Ingredient } from "./IngredientList";
import { StepList } from "./StepList";
import { useRecipeOptions } from "./UnitSelect";
import { cn } from "@/lib/utils/cn";

export interface RecipeFormData {
  title: string;
  ingredients: Ingredient[];
  steps: string[];
  reflection: string;
  rating: number;
  yields: number | null;
  calories: number | null;
  level: string | null;
  prep_min: number | null;
  cook_min: number | null;
  nutrition: { vegan?: boolean; no_milk?: boolean; no_sugar?: boolean };
}

interface Props {
  /** Initial values seeded from the AI extraction + the textarea text
   *  the user already typed before the wizard fired. The wizard takes
   *  ownership; useSubmission's text/rating/analysis no longer drive
   *  this surface once mounted. */
  initialTitle: string | null;
  initialReflection: string;
  initialRating: number;
  /** Called when the user taps "Δημοσίευση". Wizard hands the full
   *  structured payload up to the overlay → useSubmission.publishRecipe
   *  → /api/suggestions POST. */
  onPublish: (data: RecipeFormData) => void;
  isPublishing: boolean;
  /** "Άκυρο" — go back to the typing view. Clears the manual
   *  category override on the parent's side. */
  onCancel: () => void;
}

/**
 * Single-screen recipe wizard. Stages live as collapsible sections in
 * one scroll surface (Title → Ingredients → Steps → Reflection →
 * Optional). Scope explicitly excludes the link-paste path — that
 * lands in a follow-up via lib/enrichment/recipe-scraper.ts.
 *
 * Why one screen rather than a multi-step flow:
 *   - Users abandoning mid-flow lose all context. A scrollable single
 *     screen always shows the whole shape.
 *   - The data shape mirrors what admin SuggestionEditor's recipes
 *     section already emits, so /api/suggestions writes to the same
 *     item_recipes columns with no special-case code paths.
 */
export function RecipeWizard({
  initialTitle,
  initialReflection,
  initialRating,
  onPublish,
  isPublishing,
  onCancel,
}: Props) {
  const opts = useRecipeOptions();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { qty: "", unit: "", name: "" },
  ]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [reflection, setReflection] = useState(initialReflection);
  const [rating, setRating] = useState(initialRating);
  const [showOptional, setShowOptional] = useState(false);
  const [yields, setYields] = useState<string>("");
  const [calories, setCalories] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [prepMin, setPrepMin] = useState<string>("");
  const [cookMin, setCookMin] = useState<string>("");
  const [nutrition, setNutrition] = useState<{
    vegan?: boolean;
    no_milk?: boolean;
    no_sugar?: boolean;
  }>({});

  // Honour late-arriving AI extraction — if Gemini lands a title
  // after the wizard mounts, we backfill the empty title field once.
  useEffect(() => {
    if (initialTitle && !title.trim()) setTitle(initialTitle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTitle]);

  const cleanIngredients = ingredients.filter((i) => i.name.trim());
  const cleanSteps = steps.filter((s) => s.trim());
  const canPublish =
    title.trim().length > 0 &&
    cleanIngredients.length > 0 &&
    cleanSteps.length > 0 &&
    rating > 0 &&
    !isPublishing;

  const handlePublish = () => {
    if (!canPublish) return;
    onPublish({
      title: title.trim(),
      ingredients: cleanIngredients,
      steps: cleanSteps,
      reflection: reflection.trim(),
      rating,
      yields: yields ? parseInt(yields, 10) || null : null,
      calories: calories ? parseInt(calories, 10) || null : null,
      level: level || null,
      prep_min: prepMin ? parseInt(prepMin, 10) || null : null,
      cook_min: cookMin ? parseInt(cookMin, 10) || null : null,
      nutrition,
    });
  };

  // Toggle helper for the diet checkboxes — keeps the jsonb shape
  // tight (only sets keys that are true).
  const toggleNutrition = (key: "vegan" | "no_milk" | "no_sugar") => {
    setNutrition((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      {/* Header — matches the LOCKED variant from SuggestionOverlay
          so the user knows they're in a structured flow. */}
      <div className="flex items-center justify-between h-11 px-5 bg-white border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-coral-600 text-coral-600 text-xs font-bold tracking-widest uppercase">
            Συνταγή
          </span>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-zinc-500 active:text-zinc-700"
          >
            ← Άλλαξε κατηγορία
          </button>
        </div>
      </div>

      {/* Body — scrollable single-screen wizard */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6">
        {/* Title */}
        <section>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            Τίτλος συνταγής
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="πχ. Τσιπς κολοκυθάκι στο φούρνο"
            className="w-full h-11 px-3 text-base font-medium bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
          />
        </section>

        {/* Ingredients */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Υλικά
            </label>
            <span className="text-xs text-zinc-400">{cleanIngredients.length}</span>
          </div>
          <IngredientList
            value={ingredients}
            onChange={setIngredients}
            units={opts.units}
            commonIngredients={opts.common_ingredients}
          />
        </section>

        {/* Steps */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
              Εκτέλεση
            </label>
            <span className="text-xs text-zinc-400">{cleanSteps.length}</span>
          </div>
          <StepList value={steps} onChange={setSteps} />
        </section>

        {/* Reflection */}
        <section>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            Γιατί σου άρεσε
          </label>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Μοιράσου τι την κάνει ξεχωριστή…"
            rows={3}
            className="w-full px-3 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:border-zinc-400 leading-relaxed"
          />
        </section>

        {/* Rating */}
        <section>
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
            Βαθμολογία
          </label>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} αστέρια`}
                className="active:scale-90 transition-transform"
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill={n <= rating ? "#FE6F5E" : "none"}
                  stroke={n <= rating ? "#FE6F5E" : "#d4d4d8"}
                  strokeWidth="2"
                  strokeLinejoin="round"
                >
                  <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                </svg>
              </button>
            ))}
          </div>
        </section>

        {/* Optional metadata — collapsed by default */}
        <section>
          <button
            type="button"
            onClick={() => setShowOptional((v) => !v)}
            className="w-full flex items-center justify-between py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide"
          >
            <span>Επιπλέον (προαιρετικά)</span>
            <span className={cn("transition-transform", showOptional && "rotate-180")}>▾</span>
          </button>
          {showOptional && (
            <div className="space-y-4 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Μερίδες" value={yields} onChange={setYields} suffix="άτομα" />
                <NumberField label="Θερμίδες" value={calories} onChange={setCalories} suffix="kcal" />
                <NumberField label="Χρόνος προετοιμασίας" value={prepMin} onChange={setPrepMin} suffix="min" />
                <NumberField label="Χρόνος ψησίματος" value={cookMin} onChange={setCookMin} suffix="min" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Δυσκολία
                </label>
                <div className="flex gap-2">
                  {opts.levels.map((lvl) => {
                    const active = level === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setLevel(active ? "" : lvl)}
                        className={cn(
                          "h-9 px-4 rounded-full border text-sm font-medium transition-colors",
                          active
                            ? "bg-coral-50 border-coral-300 text-coral-700"
                            : "bg-white border-zinc-200 text-zinc-700",
                        )}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Διατροφή
                </label>
                <div className="flex flex-wrap gap-2">
                  <NutritionChip label="Vegan"          active={!!nutrition.vegan}    onClick={() => toggleNutrition("vegan")} />
                  <NutritionChip label="Χωρίς γαλακτικά" active={!!nutrition.no_milk}  onClick={() => toggleNutrition("no_milk")} />
                  <NutritionChip label="Χωρίς ζάχαρη"   active={!!nutrition.no_sugar} onClick={() => toggleNutrition("no_sugar")} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Publish button */}
      <div className="px-5 pb-8 pt-4 border-t border-zinc-100">
        <button
          type="button"
          onClick={handlePublish}
          disabled={!canPublish}
          className={cn(
            "w-full h-13 rounded-card text-sm font-bold tracking-widest uppercase transition-all duration-300",
            canPublish ? "text-white active:opacity-90" : "bg-zinc-100 text-zinc-400 pointer-events-none",
          )}
          style={canPublish ? { background: "linear-gradient(to right, #FE6F5E, #FF9980)" } : {}}
        >
          {isPublishing ? "Δημοσίευση…" : "Δημοσίευση συνταγής ›"}
        </button>
        {!canPublish && !isPublishing && (
          <p className="text-xs text-zinc-400 text-center mt-2">
            Συμπλήρωσε τίτλο, υλικά, βήματα και βαθμολογία για να δημοσιεύσεις.
          </p>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-zinc-500 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
          className="w-full h-9 pl-3 pr-12 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-400"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function NutritionChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 px-4 rounded-full border text-sm font-medium transition-colors",
        active
          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
          : "bg-white border-zinc-200 text-zinc-700",
      )}
    >
      {label}
    </button>
  );
}
