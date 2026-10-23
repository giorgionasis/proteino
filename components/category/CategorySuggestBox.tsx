"use client";

import Image from "next/image";
import { useOverlay } from "@/hooks/useOverlay";

/** Per-category invitation. The copy used to be about "a new shop" on
 *  every page, books and movies included. */
const PROMPT: Record<string, string> = {
  movies:  "Είδες μια ταινία που σε άγγιξε; Μοιράσου τη.",
  series:  "Τελείωσες μια σειρά που αξίζει; Πρότεινέ τη.",
  books:   "Διάβασες ένα βιβλίο που σε συγκίνησε; Πρότεινέ το.",
  food:    "Γνώρισες ένα νέο μαγαζί και θα ήθελες να το μοιραστείς;",
  bars:    "Βρήκες ένα μπαρ ή καφέ που αξίζει; Μοιράσου το.",
  hotels:  "Έμεινες κάπου που θα ξαναπήγαινες; Πρότεινέ το.",
  theater: "Είδες μια παράσταση που σε κέρδισε; Μοιράσου τη.",
  events:  "Πήγες σε μια εκδήλωση που άξιζε; Πρότεινέ τη.",
  recipes: "Έχεις μια συνταγή που αγαπάς; Μοιράσου τη.",
};
/** The animation shows someone eating — only fits the food-ish categories. */
const FOOD_ART = new Set(["food", "bars", "recipes"]);

export function CategorySuggestBox({ category }: { category?: string }) {
  const { openSuggestion } = useOverlay();
  const prompt = (category && PROMPT[category]) ?? "Έχεις κάτι που αγαπάς; Μοιράσου το.";
  const showArt = !category || FOOD_ART.has(category);

  return (
    <section className="flex flex-col items-center gap-10 px-6 py-10">
      {/* Animated illustration */}
      {showArt && <div className="w-[247px] h-[307px] relative overflow-hidden rounded-sm">
        <Image
          src="/images/suggest-cta.gif"
          alt=""
          fill
          className="object-cover"
          unoptimized
        />
      </div>}

      {/* Text + button */}
      <div className="flex flex-col items-center gap-10 w-full">
        <p
          className="text-center font-semibold leading-[140%]"
          style={{ fontSize: 22, color: "#333333" }}
        >
          {prompt}
        </p>

        <button
          onClick={() => openSuggestion()}
          className="w-full flex items-center justify-center rounded-[8px] active:opacity-80 transition-opacity"
          style={{
            height: 64,
            backgroundColor: "#27272A",
            border: "2px solid #F2F2F7",
            fontSize: 22,
            fontWeight: 700,
            color: "#F2F2F7",
          }}
        >
          Νέα πρόταση
        </button>
      </div>
    </section>
  );
}
