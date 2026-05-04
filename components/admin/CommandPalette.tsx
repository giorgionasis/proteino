"use client";

/**
 * Cmd+K command palette — global jump-to-anything search.
 *
 * Mounted once in the admin layout. Cmd+K (or Ctrl+K) toggles. Esc closes.
 * Arrow keys navigate, Enter opens. Empty state shows recent jumps + quick
 * create actions so the palette is useful even before you start typing.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface ResultItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
  thumb: string | null;
  badge?: string | null;
  category?: string;
}

interface ResultGroup {
  type: string;
  label: string;
  items: ResultItem[];
}

const QUICK_ACTIONS: ResultItem[] = [
  {
    id: "qa-new-suggestion",
    type: "action",
    title: "Νέα Suggestion",
    subtitle: "Create item from scratch",
    href: "/admin/suggestions/new",
    thumb: null,
  },
  {
    id: "qa-new-collection",
    type: "action",
    title: "Νέα Collection",
    subtitle: "Curated home/category section",
    href: "/admin/content/collections/new",
    thumb: null,
  },
  {
    id: "qa-new-activity",
    type: "action",
    title: "Νέο Activity",
    subtitle: "Nearby attraction for hotels",
    href: "/admin/content/activities/new",
    thumb: null,
  },
  {
    id: "qa-data-quality",
    type: "action",
    title: "Data Quality",
    subtitle: "Triage missing/broken data",
    href: "/admin/data-quality",
    thumb: null,
  },
  {
    id: "qa-reviews",
    type: "action",
    title: "Reviews → Reported",
    subtitle: "Jump to flagged comments",
    href: "/admin/reviews",
    thumb: null,
  },
  {
    id: "qa-settings",
    type: "action",
    title: "Settings",
    subtitle: "Maintenance mode + site identity",
    href: "/admin/settings",
    thumb: null,
  },
];

const RECENT_KEY = "admin:palette:recent";

function loadRecent(): ResultItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRecent(item: ResultItem) {
  if (typeof window === "undefined") return;
  try {
    const list = loadRecent().filter((r) => r.id !== item.id);
    list.unshift(item);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch { /* quota / private mode — silent */ }
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<ResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const recent = useMemo(() => loadRecent(), [open]);

  // Global toggle
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setGroups([]);
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setGroups([]);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setGroups(Array.isArray(data.groups) ? data.groups : []);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  // Flatten all visible items for keyboard navigation
  const flat: ResultItem[] = useMemo(() => {
    if (query.trim().length >= 2) return groups.flatMap((g) => g.items);
    // Empty state: recent first, then quick actions
    return [...recent, ...QUICK_ACTIONS];
  }, [groups, query, recent]);

  function jump(item: ResultItem) {
    saveRecent(item);
    setOpen(false);
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, flat.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = flat[activeIndex];
      if (item) jump(item);
    }
  }

  if (!open) return null;

  const showingResults = query.trim().length >= 2;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 flex items-start justify-center pt-[10vh]"
      onClick={() => setOpen(false)}
      onKeyDown={onKeyDown}
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-zinc-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" className="text-zinc-400 shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suggestions, users, collections, reviews…"
            className="flex-1 outline-none text-base placeholder:text-zinc-400"
          />
          <kbd className="text-[10px] font-semibold text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {loading && showingResults && (
            <div className="px-4 py-3 text-sm text-zinc-400">Searching…</div>
          )}

          {!loading && showingResults && groups.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-zinc-500">
              <p>No results for <strong className="text-zinc-700">"{query}"</strong></p>
              <p className="text-xs text-zinc-400 mt-1">Try fewer characters or a different field.</p>
            </div>
          )}

          {showingResults && groups.length > 0 && (() => {
            let idx = 0;
            return (
              <>
                {groups.map((g) => (
                  <div key={g.type} className="mb-1">
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {g.label}
                    </div>
                    {g.items.map((it) => {
                      const myIdx = idx++;
                      return (
                        <Row
                          key={`${g.type}-${it.id}`}
                          item={it}
                          active={activeIndex === myIdx}
                          onMouseEnter={() => setActiveIndex(myIdx)}
                          onClick={() => jump(it)}
                        />
                      );
                    })}
                  </div>
                ))}
              </>
            );
          })()}

          {/* Empty state — recent + quick actions */}
          {!showingResults && (() => {
            let idx = 0;
            return (
              <>
                {recent.length > 0 && (
                  <div className="mb-1">
                    <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Recent
                    </div>
                    {recent.map((it) => {
                      const myIdx = idx++;
                      return (
                        <Row
                          key={`recent-${it.id}`}
                          item={it}
                          active={activeIndex === myIdx}
                          onMouseEnter={() => setActiveIndex(myIdx)}
                          onClick={() => jump(it)}
                        />
                      );
                    })}
                  </div>
                )}
                <div>
                  <div className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Quick actions
                  </div>
                  {QUICK_ACTIONS.map((it) => {
                    const myIdx = idx++;
                    return (
                      <Row
                        key={`qa-${it.id}`}
                        item={it}
                        active={activeIndex === myIdx}
                        onMouseEnter={() => setActiveIndex(myIdx)}
                        onClick={() => jump(it)}
                      />
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> open</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
          <span className="font-mono">⌘K</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Row ──────────────────────────────────────────────────── */

const TYPE_ICONS: Record<string, string> = {
  suggestion: "💡",
  user: "👤",
  collection: "📚",
  activity: "🏔️",
  review: "💬",
  action: "⚡",
};

function Row({ item, active, onMouseEnter, onClick }: {
  item: ResultItem;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        active ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <div className="w-8 h-8 rounded bg-zinc-100 border border-zinc-200 flex items-center justify-center text-sm shrink-0 overflow-hidden">
        {item.thumb ? (
          <img src={item.thumb} alt="" className="w-full h-full object-cover" />
        ) : (
          <span>{TYPE_ICONS[item.type] ?? "•"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-800 truncate">{item.title}</p>
        <p className="text-xs text-zinc-500 truncate">{item.subtitle}</p>
      </div>
      {item.badge && (
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${
          item.badge === "DRAFT" ? "bg-amber-50 text-amber-700"
          : item.badge === "REPORTED" ? "bg-red-50 text-red-700"
          : "bg-zinc-100 text-zinc-500"
        }`}>{item.badge}</span>
      )}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" className={`shrink-0 ${active ? "text-zinc-400" : "text-zinc-300"}`}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}
