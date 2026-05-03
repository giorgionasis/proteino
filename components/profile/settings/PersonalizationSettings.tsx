"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { CATEGORIES as CAT_LIST } from "@/constants/categories";

const EMOJI_MAP: Record<string, string> = {
  movies: "🎬", series: "📺", books: "📚",
  food: "🍽️", recipes: "🧑‍🍳", bars: "☕",
  hotels: "🏨", theater: "🎭", events: "🎉",
};

const CATEGORIES = [
  { key: "all", label: "Όλες", emoji: "⭐" },
  ...CAT_LIST.map((c) => ({ key: c.slug, label: c.labelEl, emoji: EMOJI_MAP[c.slug] ?? "📌" })),
];

export function PersonalizationSettings() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(["books", "movies", "food"]));

  function toggle(key: string) {
    if (key === "all") {
      if (selected.size === CATEGORIES.length - 1) {
        setSelected(new Set());
      } else {
        setSelected(new Set(CATEGORIES.filter(c => c.key !== "all").map(c => c.key)));
      }
      return;
    }
    setSelected(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const allSelected = selected.size === CATEGORIES.length - 1;

  return (
    <div className="pb-24">

      <InnerHeader title="Προσωποποιημένη Εμπειρία" onBack={() => router.back()} />

      <div className="px-5 pt-8 space-y-8">

        {/* Intro */}
        <div className="space-y-4">
          <p className="text-[22px] font-bold text-zinc-800 leading-[130%]">Προτάσεις που<br />σου ταιριάζουν</p>
          <p className="text-[16px] font-normal text-zinc-700 leading-[130%]">Θέλουμε να σου παρέχουμε προτάσεις που σε αφορούν. Διάλεξε τις κατηγορίες που σε ενδιαφέρουν για να μη σε κουράζουμε.</p>
        </div>

        {/* Section header */}
        <p className="text-[16px] font-bold text-zinc-700">Με ενδιαφέρουν</p>

        {/* Category grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}>
          {CATEGORIES.map(({ key, label, emoji }) => {
            const active = key === "all" ? allSelected : selected.has(key);
            return (
              <button key={key} onClick={() => toggle(key)}
                className="flex flex-col items-center gap-3 rounded-[12px] py-5 px-4 active:opacity-80 transition-all"
                style={{
                  backgroundColor: active ? "#FFF5EC" : "#F4F4F5",
                  border: `1.5px solid ${active ? "#FE6F5E" : "transparent"}`,
                }}>
                <span className="text-[32px] leading-none" aria-hidden>{emoji}</span>
                <span className="text-[15px] font-semibold leading-[130%]"
                  style={{ color: active ? "#FE6F5E" : "#3F3F46" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-zinc-200 z-20">
        <button
          onClick={() => router.back()}
          className="w-full h-[52px] rounded-[12px] text-[16px] font-bold text-white active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}>
          Αποθήκευση
        </button>
      </div>
    </div>
  );
}
