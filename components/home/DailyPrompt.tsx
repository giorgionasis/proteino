"use client";

import { useOverlay } from "@/hooks/useOverlay";

interface DailyPromptProps {
  username: string;
}

export function DailyPrompt({ username }: DailyPromptProps) {
  const { openSuggestion } = useOverlay();

  return (
    <section className="px-6">
      <div className="bg-zinc-950 rounded-card p-5">
        <p className="text-[11px] text-coral-400 uppercase tracking-wide mb-1">Σειρά σου!</p>
        <h3 className="text-base font-bold text-white mb-1">
          {username}, συνεισφέρεις;
        </h3>
        <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
          Ανακάλυψες κάτι καλό τελευταία;
        </p>
        <button
          onClick={() => openSuggestion()}
          className="bg-coral-600 text-white text-sm font-semibold px-6 py-2.5 rounded-full active:bg-coral-700 transition-colors"
        >
          Προτείνω
        </button>
      </div>
    </section>
  );
}
