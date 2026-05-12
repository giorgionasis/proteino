"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/constants/categories";

interface Props {
  initial:    string[];
  onContinue: (picked: string[]) => void | Promise<void>;
  onBack:     () => void;
}

const MIN_PICKS = 2;
const AI_DEBOUNCE_MS = 700;

/**
 * Screen 2 — Interests.
 *
 * Two paths to the same destination:
 *
 *   - Tap path (default, lowest friction): tap emoji tiles, see the
 *     counter rise, hit Επόμενο.
 *   - Conversational path (discoverable expansion): tap the "✨ Ή πες
 *     μου με δικά σου λόγια" link. An inline textarea slides down on
 *     the same screen. As the user types, /api/onboarding/parse-
 *     interests fires after a short debounce; matching grid cells
 *     animate-pop-in as if the AI is reading along. Tap path remains
 *     available — both can be combined.
 *
 * No new step, no modal — the magic is offered, not imposed.
 */
export function InterestsScreen({ initial, onContinue, onBack }: Props) {
  const [picked, setPicked] = useState<Set<string>>(new Set(initial));
  const [busy, setBusy] = useState(false);

  // Conversational expansion state.
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  // Re-render trigger for cells that the AI just lit up. Holds the
  // most recent AI-added slug so we can briefly highlight it with
  // animate-pop-in. (set + immediate clear via a 1s timer.)
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const list = useMemo(() => CATEGORIES, []);

  const toggle = (slug: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const count = picked.size;
  const canContinue = count >= MIN_PICKS;

  const handleContinue = async () => {
    if (!canContinue || busy) return;
    setBusy(true);
    try {
      await onContinue(Array.from(picked));
    } finally {
      setBusy(false);
    }
  };

  // Debounced AI parse. Fires when the user pauses typing in the
  // textarea. Matched slugs are merged into `picked` — never removed
  // (the user might have explicitly tapped a category they didn't
  // mention; respecting their taps over the AI's read is the right
  // hierarchy).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!expanded) return;
    if (text.trim().length < 4) {
      setAiNote(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setParsing(true);
      try {
        const res = await fetch("/api/onboarding/parse-interests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const data = await res.json();
        const cats: string[] = Array.isArray(data?.categories) ? data.categories : [];
        if (cats.length === 0) {
          setAiNote("Δεν κατάλαβα ακόμα — πρόσθεσε λίγη λεπτομέρεια.");
          return;
        }
        setAiNote(`Διάβασα: ${cats.map(catLabel).join(" · ")}`);
        // Merge into picked, additive only.
        const newlyAdded = new Set<string>();
        setPicked((prev) => {
          const next = new Set(prev);
          for (const c of cats) {
            if (!next.has(c)) {
              next.add(c);
              newlyAdded.add(c);
            }
          }
          return next;
        });
        if (newlyAdded.size > 0) {
          setJustAdded(newlyAdded);
          setTimeout(() => setJustAdded(new Set()), 1200);
        }
      } catch {
        setAiNote(null);
      } finally {
        setParsing(false);
      }
    }, AI_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, expanded]);

  return (
    <div className="min-h-screen flex flex-col px-6 pt-6 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          aria-label="Πίσω"
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-zinc-100 transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="text-[13px] font-medium text-zinc-500 tracking-wider">1 / 3</span>
        <div className="w-9 h-9" />
      </div>

      <div className="mt-3 flex gap-2 justify-center">
        <span className="w-8 h-1 rounded-full bg-coral-500" />
        <span className="w-8 h-1 rounded-full bg-zinc-200" />
        <span className="w-8 h-1 rounded-full bg-zinc-200" />
      </div>

      <div className="mt-8 space-y-2 text-center">
        <h1 className="text-[24px] font-extrabold leading-[1.2] text-zinc-900">
          Τι να σου φέρνουμε
          <br />στο feed;
        </h1>
        <p className="text-[15px] leading-[1.45] text-zinc-600 px-4">
          Διάλεξε όσα σε ενδιαφέρουν — κρύβουμε ό,τι δεν σε αφορά.
        </p>
      </div>

      {/* Category grid */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {list.map((c) => {
          const active = picked.has(c.slug);
          const wasJustAdded = justAdded.has(c.slug);
          return (
            <button
              key={c.slug}
              onClick={() => toggle(c.slug)}
              className={`flex flex-col items-center justify-center gap-2 rounded-[12px] py-5 px-2 active:scale-[0.97] transition-all ${
                wasJustAdded ? "animate-pop-in" : ""
              }`}
              style={{
                backgroundColor: active ? "#FFF5EC" : "#F4F4F5",
                border: `1.5px solid ${active ? "#FE6F5E" : "transparent"}`,
              }}
              aria-pressed={active}
            >
              <span className="text-[28px] leading-none" aria-hidden>{c.icon}</span>
              <span
                className="text-[13px] font-semibold leading-[130%] text-center"
                style={{ color: active ? "#FE6F5E" : "#3F3F46" }}
              >
                {c.labelEl}
              </span>
            </button>
          );
        })}
      </div>

      {/* Live counter */}
      <div className="mt-6 text-center min-h-[24px]">
        {count >= MIN_PICKS ? (
          <p className="text-[14px] font-semibold text-success animate-fade-in">
            {count} επιλεγμένα ✓
          </p>
        ) : count > 0 ? (
          <p className="text-[14px] text-zinc-500">
            Διάλεξε άλλα {MIN_PICKS - count} για να συνεχίσεις
          </p>
        ) : (
          <p className="text-[14px] text-zinc-400">
            Επίλεξε τουλάχιστον {MIN_PICKS}
          </p>
        )}
      </div>

      {/* Conversational expansion — link or textarea */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="mt-4 mx-auto flex items-center gap-1.5 px-4 py-2 rounded-full text-[14px] font-semibold text-coral-600 bg-coral-50 active:scale-[0.97] transition-transform"
        >
          <span aria-hidden>✨</span>
          <span>Ή πες μου με δικά σου λόγια →</span>
        </button>
      ) : (
        <div className="mt-5 animate-fade-in">
          <div className="rounded-[12px] border-[1.5px] border-coral-200 bg-coral-50/60 p-3 focus-within:border-coral-500 transition-colors">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="π.χ. λατρεύω το σινεμά, διαβάζω πολύ, και ψάχνω συνεχώς νέα μέρη για φαγητό…"
              rows={3}
              maxLength={500}
              className="w-full bg-transparent text-[14px] text-zinc-800 placeholder-zinc-400 resize-none focus:outline-none leading-snug"
            />
            <div className="flex items-center justify-between mt-2 min-h-[20px]">
              <span className="text-[11px] font-medium tracking-wide uppercase text-coral-600/80">
                {parsing ? "Διαβάζω…" : (aiNote ?? "Proteíno Intelligence")}
              </span>
              <button
                onClick={() => { setExpanded(false); setText(""); setAiNote(null); }}
                className="text-[12px] text-zinc-500 active:opacity-60"
              >
                Κλείσιμο
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-zinc-200 z-10 max-w-[390px] mx-auto">
        <button
          onClick={handleContinue}
          disabled={!canContinue || busy}
          className="w-full h-[52px] rounded-[12px] text-white text-[16px] font-bold active:scale-[0.98] transition-all disabled:opacity-40 disabled:active:scale-100"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}
        >
          {busy ? "Αποθήκευση…" : "Επόμενο →"}
        </button>
      </div>
    </div>
  );
}

function catLabel(slug: string): string {
  const c = CATEGORIES.find((x) => x.slug === slug);
  return c?.labelEl ?? slug;
}
