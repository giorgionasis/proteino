"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Star } from "lucide-react";
import Link from "next/link";
import { OverlayHeader } from "@/components/layout/Header";
import { useSearch, type SearchUserHit } from "@/hooks/useSearch";
import { useOverlay } from "@/hooks/useOverlay";
import { CATEGORIES } from "@/constants/categories";
import { getSeasonalPrompts } from "@/constants/searchPrompts";
import type { CategorySlug, Item } from "@/types";
import { cn } from "@/lib/utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────────

const AI_MESSAGES = [
  "Διαβάζω τι ψάχνεις...",
  "Συγκρίνω με την κοινότητα...",
  "Βρίσκω τα καλύτερα ταιριάσματα...",
  "Ταξινομώ ανά ποιότητα...",
];

const HISTORY_KEY = "proteino_search_history_v1";
const HISTORY_MAX = 8;

// (seasonal prompts moved to constants/searchPrompts.ts)

// ── Pill ──────────────────────────────────────────────────────────────────────

function PillTag({
  pill,
  onRemove,
}: {
  pill: { type: "VIBE" | "TYPE" | "LOC" | "CATEGORY"; value: string };
  onRemove: () => void;
}) {
  const colorByType = {
    CATEGORY: "text-zinc-700 bg-zinc-100 border-zinc-200",
    VIBE: "text-coral-600 bg-coral-50 border-coral-200",
    TYPE: "text-warning bg-amber-50 border-amber-200",
    LOC:  "text-success bg-emerald-50 border-emerald-200",
  }[pill.type];

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-xs font-bold tracking-wider", colorByType)}>
      <span className="opacity-60">{pill.type}</span>
      <span>{pill.value}</span>
      <button
        onClick={onRemove}
        aria-label={`Αφαίρεση ${pill.type}`}
        className="ml-0.5 -mr-1 w-4 h-4 flex items-center justify-center rounded-full active:bg-black/10 transition-colors"
      >
        <X size={11} strokeWidth={3} />
      </button>
    </span>
  );
}

// ── Intelligence panel ────────────────────────────────────────────────────────

function IntelligencePanel({ progress, message, tier }: {
  progress: number;
  message: string;
  tier: "high" | "medium" | "low" | null;
}) {
  return (
    <div className="bg-zinc-900 rounded-card p-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-300 ease-spring">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-coral-600 tracking-[0.2em] uppercase">
          Proteino Intelligence
        </span>
        {tier ? (
          <span className={cn(
            "text-[10px] font-bold tracking-widest uppercase",
            tier === "high" ? "text-coral-600" : tier === "medium" ? "text-warning" : "text-zinc-400",
          )}>
            {tier === "high" ? "Σίγουρο" : tier === "medium" ? "Πιθανό" : "Διερευνώ"}
          </span>
        ) : (
          <span className="text-xs text-zinc-500 tabular-nums">{progress}%</span>
        )}
      </div>
      <p className="text-sm font-medium text-white leading-snug">{message}</p>
      <div className="h-[3px] bg-zinc-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%`, background: "linear-gradient(to right, #FE6F5E, #FF9980)" }}
        />
      </div>
    </div>
  );
}

// ── Featured hero (high-confidence single-item match) ─────────────────────────

function FeaturedHero({ item }: { item: Item }) {
  const cleanSlug = item.slug.includes("/") ? item.slug : `${item.category}/${item.slug}`;
  const cover = item.poster_url ?? item.cover_url;

  return (
    <Link
      href={`/${cleanSlug}`}
      className="block rounded-2xl overflow-hidden border border-coral-200 bg-coral-50/50 active:bg-coral-50 transition-colors"
    >
      <div className="flex gap-4 p-4">
        <div className="w-20 h-28 rounded-card overflow-hidden bg-zinc-100 shrink-0">
          {cover && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cover} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p className="text-[10px] font-bold text-coral-600 tracking-[0.2em] uppercase mb-1">
            ✓ Ακριβώς αυτό
          </p>
          <p className="text-base font-bold text-zinc-900 leading-tight">{item.title}</p>
          <p className="text-[12px] text-zinc-500 mt-1 uppercase tracking-wider">{item.category}</p>
          {item.avg_rating > 0 && (
            <div className="flex items-center gap-0.5 mt-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={12} strokeWidth={1.5}
                  fill={s <= Math.round(item.avg_rating) ? "#FE6F5E" : "transparent"}
                  stroke={s <= Math.round(item.avg_rating) ? "#FE6F5E" : "#d4d4d8"} />
              ))}
              <span className="ml-1 text-[11px] text-zinc-500 tabular-nums">{item.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ item, index = 0 }: { item: Item; index?: number }) {
  const cleanSlug = item.slug.includes("/") ? item.slug : `${item.category}/${item.slug}`;
  const cover = item.poster_url ?? item.cover_url;

  return (
    <Link
      href={`/${cleanSlug}`}
      className="flex items-center gap-3 p-3 bg-white rounded-card border border-zinc-200 active:scale-[0.99] active:bg-zinc-50 transition-[transform,colors] duration-150 ease-out animate-in slide-in-from-bottom-2 fade-in fill-mode-both ease-soft"
      style={{ animationDuration: "300ms", animationDelay: `${Math.min(index, 10) * 40}ms` }}
    >
      <div className="w-14 h-14 rounded-sm bg-zinc-100 shrink-0 overflow-hidden">
        {cover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={cover} alt="" className="w-full h-full object-cover" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-zinc-800 truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
            {item.category}
          </span>
          {item.avg_rating > 0 && (
            <>
              <span className="text-zinc-300 leading-none">·</span>
              <span className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase">
                ★ {item.avg_rating.toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

// ── User hit row ──────────────────────────────────────────────────────────────

function UserHitRow({ user }: { user: SearchUserHit }) {
  return (
    <Link href={`/profile/${user.handle}`} className="flex items-center gap-3 p-3 bg-white rounded-card border border-zinc-200 active:bg-zinc-50 transition-colors">
      <div className="w-10 h-10 rounded-full bg-zinc-100 overflow-hidden shrink-0">
        {user.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-bold">
            {user.display_name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-800 truncate">{user.display_name}</p>
        <p className="text-[12px] text-zinc-500">@{user.handle}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-300 shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

// ── No-match narrowing chips ──────────────────────────────────────────────────

function NoMatchChips({
  onPickCategory,
  onClearLocation,
  onSuggest,
  onAskAi,
  hasLocation,
}: {
  onPickCategory: () => void;
  onClearLocation: () => void;
  onSuggest: () => void;
  onAskAi: () => void;
  hasLocation: boolean;
}) {
  const chips = [
    { label: "Διαφορετική κατηγορία", onClick: onPickCategory },
    ...(hasLocation ? [{ label: "Χωρίς περιοχή", onClick: onClearLocation }] : []),
    { label: "Πρότεινέ το πρώτος", onClick: onSuggest, primary: true },
    { label: "Ρώτα τον AI", onClick: onAskAi, ghost: true },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={c.onClick}
          className={cn(
            "h-9 px-3.5 rounded-full text-sm font-semibold transition-colors",
            c.primary
              ? "text-white"
              : c.ghost
                ? "text-zinc-500 active:text-zinc-700"
                : "bg-white border border-zinc-200 text-zinc-700 active:bg-zinc-50",
          )}
          style={c.primary ? { background: "linear-gradient(to right, #FE6F5E, #FF9980)" } : {}}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// ── Mini-chat (escalation when chips don't help) ──────────────────────────────

function MiniChat({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (q: string) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="rounded-card bg-zinc-50 border border-zinc-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-coral-600 tracking-widest uppercase">Ρώτα τον AI</p>
          <p className="text-sm text-zinc-700 leading-snug mt-1">
            Πες μου με δικά σου λόγια — τι ακριβώς ψάχνεις; Σειρά, φαγητό, βιβλίο, βραδινή έξοδος;
          </p>
        </div>
        <button onClick={onClose} aria-label="Κλείσιμο chat" className="w-7 h-7 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0">
          <X size={14} strokeWidth={2.5} className="text-zinc-500" />
        </button>
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onSubmit(draft.trim()); setDraft(""); } }}
        placeholder="πχ. Σειρά για το Σ/Κ, ελαφριά..."
        className="w-full bg-white border border-zinc-200 rounded-card px-4 py-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400"
      />
    </div>
  );
}

// ── Empty state: history + seasonal prompts ───────────────────────────────────

function EmptyState({
  history,
  onPick,
  onClearHistoryItem,
}: {
  history: string[];
  onPick: (q: string) => void;
  onClearHistoryItem: (q: string) => void;
}) {
  const seasonal = getSeasonalPrompts();
  return (
    <div className="space-y-6">
      {history.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
            Πρόσφατες αναζητήσεις
          </p>
          <div className="space-y-2">
            {history.map((q) => (
              <div key={q} className="flex items-center gap-2">
                <button
                  onClick={() => onPick(q)}
                  className="flex-1 text-left px-4 py-3 bg-zinc-50 rounded-card text-sm font-medium text-zinc-700 active:bg-zinc-100 transition-colors flex items-center gap-3"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="truncate">{q}</span>
                </button>
                <button
                  onClick={() => onClearHistoryItem(q)}
                  aria-label="Διαγραφή"
                  className="w-9 h-9 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0"
                >
                  <X size={14} strokeWidth={2.5} className="text-zinc-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
          Δοκίμασε
        </p>
        <div className="space-y-2">
          {seasonal.map((q) => (
            <button
              key={q}
              onClick={() => onPick(q)}
              className="w-full text-left px-4 py-3.5 bg-coral-50/40 border border-coral-200/50 rounded-card text-sm font-medium text-zinc-800 active:bg-coral-50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface SearchOverlayProps {
  onClose: () => void;
}

export function SearchOverlay({ onClose }: SearchOverlayProps) {
  const {
    state,
    query,
    pills,
    confidenceTier,
    featured,
    results,
    userHits,
    fallbackSuggestions,
    conversationalPrompt,
    errorMessage,
    regionFallbackUsed,
    addressMatchUsed,
    retry,
    setQuery: hookSetQuery,
    removePill,
    pickCategory,
    clear: hookClear,
  } = useSearch();
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chipAttempts, setChipAttempts] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load history from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Persist a query into history once the user has settled — i.e. results
  // landed AND no further keystrokes for 1.5s. Without this debounce every
  // intermediate keystroke that produced results (an / ano / anor / anora)
  // hits localStorage and pollutes history. Dedup is case+accent-insensitive
  // so "Anora" + "anora" / "Αθήνα" + "αθηνα" produce a single entry.
  useEffect(() => {
    if (state !== "results" || !query.trim()) return;
    const t = setTimeout(() => {
      setHistory((prev) => {
        const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
        const target = norm(query);
        const filtered = prev.filter((q) => norm(q) !== target);
        const next = [query, ...filtered].slice(0, HISTORY_MAX);
        try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [state, query]);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) { clearInterval(tickerRef.current); tickerRef.current = null; }
  }, []);

  useEffect(() => () => stopTicker(), [stopTicker]);

  // Progress mirrors actual fetch state instead of randomness:
  //   empty   → 0   (nothing yet)
  //   typing  → 30  (debounce in flight, request not sent)
  //   analyzing → 70 (request in flight)
  //   results / no_match → 100 (terminal)
  //   error   → 100 (terminal, error state)
  // Message rotation also stops once we leave typing/analyzing — no point
  // pretending AI is still working when results have landed.
  useEffect(() => {
    if (state === "empty") {
      stopTicker();
      setProgress(0);
      setMsgIndex(0);
      setShowChat(false);
      setChipAttempts(0);
      return;
    }
    if (state === "typing") {
      stopTicker();
      setProgress(30);
      let m = 0;
      tickerRef.current = setInterval(() => {
        m = (m + 1) % AI_MESSAGES.length;
        setMsgIndex(m);
      }, 700);
      return;
    }
    if (state === "analyzing") {
      stopTicker();
      setProgress(70);
      let m = 0;
      tickerRef.current = setInterval(() => {
        m = (m + 1) % AI_MESSAGES.length;
        setMsgIndex(m);
      }, 700);
      return;
    }
    // results | no_match | error → done
    stopTicker();
    setProgress(100);
  }, [state, stopTicker]);

  const resizeTextarea = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    hookSetQuery(e.target.value);
    setTimeout(resizeTextarea, 0);
  };

  const handlePick = (q: string) => {
    hookSetQuery(q);
    setTimeout(resizeTextarea, 0);
  };

  const handleClearHistoryItem = (q: string) => {
    setHistory((prev) => {
      const next = prev.filter((x) => x !== q);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handlePickCategory = () => {
    setChipAttempts((n) => n + 1);
    setShowCategoryPicker((v) => !v);
  };

  const handleCategoryChosen = (slug: CategorySlug) => {
    setShowCategoryPicker(false);
    pickCategory(slug);
  };

  const handleClearLocation = () => {
    setChipAttempts((n) => n + 1);
    const locPillIdx = pills.findIndex((p) => p.type === "LOC");
    if (locPillIdx >= 0) removePill(locPillIdx);
  };

  const handleSuggestFirst = () => {
    // Close search and open suggestion overlay with the user's query as
    // pre-fill. SuggestionOverlay's mount effect consumes the prefill from
    // the overlay store and seeds setText with it.
    useOverlay.getState().openSuggestion(query);
  };

  const handleAskAi = () => {
    setShowChat(true);
  };

  const handleChatSubmit = (q: string) => {
    setShowChat(false);
    setChipAttempts(0);
    hookSetQuery(q);
    setTimeout(resizeTextarea, 0);
  };

  const showPanel = state !== "empty";
  const isResults = state === "results";
  const isNoMatch = state === "no_match";
  const isError = state === "error";
  const showChips = isNoMatch && !showChat;
  // Auto-escalate to chat after 2 failed chip narrows
  const shouldAutoEscalate = isNoMatch && chipAttempts >= 2 && !showChat;

  useEffect(() => {
    if (shouldAutoEscalate) setShowChat(true);
  }, [shouldAutoEscalate]);

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <OverlayHeader
        label="Smart Search"
        icon={<Search size={16} strokeWidth={2.5} />}
        onClose={onClose}
      />

      <div
        className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-4"
        aria-live="polite"
        aria-busy={state === "analyzing" || state === "typing"}
      >
        {/* Query textarea + inline clear (X) button */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={query}
            onChange={handleChange}
            placeholder="Πες μου τι ψάχνεις..."
            rows={1}
            className={cn(
              "w-full resize-none overflow-hidden",
              "bg-zinc-50 border border-zinc-200 rounded-card",
              "py-3.5 text-base font-medium text-zinc-800 placeholder:text-zinc-400",
              "focus:outline-none focus:border-zinc-400 transition-colors",
              "leading-relaxed",
              query ? "pl-4 pr-12" : "px-4",
            )}
          />
          {query && (
            <button
              onClick={() => { hookClear(); textareaRef.current?.focus(); }}
              aria-label="Καθαρισμός"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200/70 active:bg-zinc-300 transition-colors"
            >
              <X size={14} strokeWidth={2.5} className="text-zinc-600" />
            </button>
          )}
        </div>

        {/* Tappable removable pills */}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pills.map((p, i) => (
              <PillTag key={`${p.type}:${p.value}`} pill={p} onRemove={() => removePill(i)} />
            ))}
          </div>
        )}

        {/* Intelligence panel — analyzing + tier + count */}
        {showPanel && (() => {
          const itemsCount = results.length + (featured && !results.find((r) => r.id === featured.id) ? 1 : 0);
          const usersCount = userHits.length;
          const totalCount = itemsCount + usersCount;
          let message: string;
          if (isError) {
            message = "Σφάλμα — δες παρακάτω για λεπτομέρειες.";
          } else if (isNoMatch) {
            message = "Δε βρήκα ακριβώς αυτό. Δες κοντινές προτάσεις ή πρότεινέ το πρώτος.";
          } else if (isResults) {
            const noun = totalCount === 1 ? "αποτέλεσμα" : "αποτελέσματα";
            const prefix = confidenceTier === "high"
              ? `✓ Βρήκα ακριβώς αυτό που ψάχνεις · ${totalCount} ${noun}`
              : confidenceTier === "medium"
                ? `Βρήκα ${totalCount} πιθαν${totalCount === 1 ? "ή αντιστοιχία" : "ές αντιστοιχίες"}`
                : `Βρήκα ${totalCount} ${noun} — δες παρακάτω`;
            message = prefix;
          } else {
            message = AI_MESSAGES[msgIndex];
          }
          return (
            <IntelligencePanel
              progress={progress}
              message={message}
              tier={isResults || isNoMatch ? confidenceTier : null}
            />
          );
        })()}

        {/* Empty state — history + seasonal prompts */}
        {state === "empty" && (
          <EmptyState
            history={history}
            onPick={handlePick}
            onClearHistoryItem={handleClearHistoryItem}
          />
        )}

        {/* High-confidence FEATURED hero */}
        {isResults && featured && (
          <FeaturedHero item={featured} />
        )}

        {/* User hits */}
        {(isResults || isNoMatch) && userHits.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
              Χρήστες
            </p>
            {userHits.map((u) => <UserHitRow key={u.id} user={u} />)}
          </div>
        )}

        {/* Honesty banner — region filter ghosted, results are global. */}
        {isResults && regionFallbackUsed && (
          <div className="rounded-card bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[13px] text-zinc-700 leading-snug">
              <span className="font-semibold">Λίγα στη συγκεκριμένη περιοχή.</span>{" "}
              {addressMatchUsed
                ? "Δείχνω αυτά που βρήκα + δημοφιλέστερα συνολικά."
                : "Δείχνω δημοφιλέστερα συνολικά — δοκίμασε διαφορετική περιοχή."}
            </p>
          </div>
        )}

        {/* Item results — grouped by category when 2+ categories present
            (e.g. "Χαλάνδρι" returns mixed bars/restaurants/hotels), flat
            list otherwise. Featured hero is excluded from both. */}
        {isResults && results.length > 0 && (() => {
          const visibleResults = results.filter((it) => !featured || it.id !== featured.id);
          // Group by category
          const grouped = new Map<string, Item[]>();
          for (const it of visibleResults) {
            const cat = it.category;
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat)!.push(it);
          }
          const useGrouping = grouped.size >= 2;

          if (!useGrouping) {
            return (
              <div className="space-y-2.5">
                {featured && (
                  <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
                    Άλλα αποτελέσματα · {visibleResults.length}
                  </p>
                )}
                {visibleResults.map((item, i) => <ResultCard key={item.id} item={item} index={i} />)}
              </div>
            );
          }

          // Grouped: order categories by hit count, descending
          const ordered = Array.from(grouped.entries()).sort(
            (a, b) => b[1].length - a[1].length,
          );
          return (
            <div className="space-y-5">
              {ordered.map(([cat, list]) => {
                const meta = CATEGORIES.find((c) => c.slug === (cat as CategorySlug));
                return (
                  <div key={cat} className="space-y-2.5">
                    <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
                      {meta?.icon} {meta?.labelEl ?? cat} · {list.length}
                    </p>
                    {list.slice(0, 5).map((item, i) => <ResultCard key={item.id} item={item} index={i} />)}
                    {list.length > 5 && (
                      <p className="text-[12px] font-semibold text-coral-600 px-1">
                        +{list.length - 5} ακόμα στα {meta?.labelEl ?? cat}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Error state — clearly distinct from "no results found" */}
        {isError && (
          <div className="rounded-card bg-red-50 border border-red-200 p-4 space-y-3" role="alert">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C0392B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-red-700 leading-tight">Κάτι πήγε στραβά</p>
                <p className="text-[13px] text-red-600 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={retry}
              className="w-full h-10 rounded-card bg-red-600 text-white text-sm font-bold tracking-widest uppercase active:bg-red-700 transition-colors"
            >
              Δοκίμασε ξανά
            </button>
          </div>
        )}

        {/* No-match → fallback suggestions + chips + chat */}
        {isNoMatch && (
          <div className="space-y-4">
            {conversationalPrompt && (
              <div
                className="rounded-2xl px-4 py-3.5"
                style={{ background: "#FFF5EC", border: "1px solid rgba(254,111,94,0.15)" }}
              >
                <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#FE6F5E" }}>
                  Proteino σε ρωτάει
                </div>
                <div className="text-[14px] font-medium text-zinc-800 leading-snug">
                  {conversationalPrompt}
                </div>
              </div>
            )}
            {fallbackSuggestions.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
                  Πιθανώς εννοούσες
                </p>
                {fallbackSuggestions.map((it, i) => <ResultCard key={it.id} item={it} index={i} />)}
              </div>
            )}
            {showChips && (
              <>
                <NoMatchChips
                  hasLocation={pills.some((p) => p.type === "LOC")}
                  onPickCategory={handlePickCategory}
                  onClearLocation={handleClearLocation}
                  onSuggest={handleSuggestFirst}
                  onAskAi={handleAskAi}
                />
                {showCategoryPicker && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase px-1">
                      Διάλεξε κατηγορία
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.map((c) => (
                        <button
                          key={c.slug}
                          onClick={() => handleCategoryChosen(c.slug)}
                          className="h-9 px-3.5 rounded-full bg-white border border-zinc-200 text-sm font-semibold text-zinc-700 active:bg-zinc-50 transition-colors"
                        >
                          <span className="mr-1.5">{c.icon}</span>
                          {c.labelEl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {showChat && (
              <MiniChat onClose={() => setShowChat(false)} onSubmit={handleChatSubmit} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
