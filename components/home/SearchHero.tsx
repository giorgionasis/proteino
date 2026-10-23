"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useOverlay } from "@/hooks/useOverlay";

/**
 * Home opener (session 40): show the product in the first screen. The
 * search understands Greek sentences, so the hero IS the search — real
 * example queries cycle as the placeholder and the chips run them.
 * Every example was checked to return good results.
 */
const EXAMPLES = [
  "θρίλερ για βροχερή Κυριακή",
  "κωμωδία για όλη την οικογένεια",
  "ιστορικό μυθιστόρημα",
  "εύκολο γλυκό",
  "μπαρ με κοκτέιλ",
];

interface SearchHeroProps {
  suggestionCount: number;
  contributors: number;
  /** Members get a shorter version under their greeting. */
  compact?: boolean;
}

export function SearchHero({ suggestionCount, contributors, compact = false }: SearchHeroProps) {
  const { openSearch } = useOverlay();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((n) => (n + 1) % EXAMPLES.length), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="px-6 pt-4 flex flex-col gap-5">
      {!compact && (
        <div className="flex flex-col gap-3">
          <h1 className="text-[34px] font-extrabold text-zinc-900 leading-[110%] text-balance">
            Τι ψάχνεις σήμερα;
          </h1>
          <p className="text-[16px] font-medium text-zinc-600 leading-[140%]">
            Γράψε όπως μιλάς. Βρίσκουμε προτάσεις από αληθινούς ανθρώπους.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => openSearch()}
        className="w-full flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left shadow-[0_6px_24px_-12px_rgba(254,111,94,0.45)] active:scale-[0.99] transition-transform"
        aria-label="Αναζήτηση"
      >
        <Search size={20} className="text-coral-600 shrink-0" strokeWidth={2.25} />
        <span className="text-[16px] text-zinc-500 truncate">«{EXAMPLES[i]}»</span>
      </button>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.slice(0, 4).map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => openSearch(q)}
            className="rounded-full bg-coral-50 text-[13px] font-semibold text-zinc-800 px-3 py-2 active:bg-coral-100 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>

      {!compact && suggestionCount > 0 && (
        <p className="text-[13px] text-zinc-500">
          <span className="font-bold text-zinc-800">{suggestionCount.toLocaleString("el-GR")}</span> προτάσεις από{" "}
          <span className="font-bold text-zinc-800">{contributors.toLocaleString("el-GR")}</span> μέλη
        </p>
      )}
    </section>
  );
}
