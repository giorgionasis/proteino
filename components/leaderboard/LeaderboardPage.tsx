"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/icons";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { CATEGORIES as CAT_LIST } from "@/constants/categories";

type Period = "all" | "month" | "week";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all",   label: "Όλη τη διάρκεια"  },
  { key: "month", label: "Τελευταίο μήνα"   },
  { key: "week",  label: "Τελευταία εβδομάδα" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Όλες οι κατηγορίες" },
  ...CAT_LIST.map((c) => ({ value: c.slug, label: c.labelEl })),
];

interface LeaderboardRow {
  id:           string;
  handle:       string;
  display_name: string | null;
  avatar_url:   string | null;
  level:        number;
  score:        number;
  rank:         number;
  is_viewer:    boolean;
}

interface LeaderboardData {
  period:     Period;
  category:   string;
  top:        LeaderboardRow[];
  viewer:     LeaderboardRow | null;
  neighbours: LeaderboardRow[];
}

export function LeaderboardPage() {
  const router = useRouter();
  const [period, setPeriod]     = useState<Period>("all");
  const [category, setCategory] = useState("all");
  const [dropOpen, setDropOpen] = useState(false);
  const [data, setData]         = useState<LeaderboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  // Fetch on every filter change. Cheap-enough — the RPC is indexed
  // and the payload is tiny (~12 rows max).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/leaderboard?period=${encodeURIComponent(period)}&category=${encodeURIComponent(category)}`,
          { cache: "no-store" },
        );
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          if (body?.code === "MISSING_RPC") {
            setError("Migration 024 δεν έχει τρέξει ακόμα. Πες στον admin.");
          } else {
            setError(body?.error ?? `Αποτυχία (${res.status})`);
          }
          setData(null);
        } else {
          setData(body as LeaderboardData);
        }
      } catch {
        if (!cancelled) setError("Αποτυχία σύνδεσης. Δοκίμασε ξανά.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [period, category]);

  const categoryLabel = useMemo(
    () => CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? "Όλες οι κατηγορίες",
    [category],
  );

  return (
    <div className="pb-24">

      <InnerHeader title="Leaderboard" onBack={() => router.back()} />

      {/* Hero */}
      <div className="px-6 pt-8 flex items-center gap-3 justify-between">
        <div className="space-y-4 flex-1">
          <p className="text-[36px] font-extrabold text-zinc-800 leading-[48px]">Leaderboard</p>
          <p className="text-[16px] font-medium text-zinc-800 leading-[130%]">
            Ανακάλυψε τους χρήστες με τη<br />μεγαλύτερη συμμετοχή
          </p>
        </div>
        <Icon name="leaderboard-trophy" width={120} height={120} alt="" />
      </div>

      {/* Filters */}
      <div className="mt-10 space-y-8">

        {/* Period pills */}
        <div className="space-y-4 px-6">
          <p className="text-[18px] font-bold text-zinc-800">Διάρκεια</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-hide">
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className="shrink-0 rounded-[50px] active:opacity-80 transition-opacity"
                  style={{
                    padding: "16px 14px",
                    backgroundColor: active ? "#3F3F46" : "#FFFFFF",
                    border:          active ? "none"     : "1px solid #D4D4D8",
                    opacity:         active ? 0.9        : 1,
                  }}
                >
                  <span
                    className={`text-[14px] whitespace-nowrap ${active ? "font-bold" : "font-semibold"}`}
                    style={{ color: active ? "#FAFAFA" : "#3F3F46" }}
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category dropdown */}
        <div className="space-y-4 px-6">
          <p className="text-[18px] font-bold text-zinc-800">Κατηγορία</p>
          <div className="relative">
            <button
              onClick={() => setDropOpen((v) => !v)}
              className="flex items-center gap-1 rounded-[8px] active:opacity-80 transition-opacity"
              style={{ padding: "6px 8px 6px 16px", border: "1.5px solid #A1A1AA", height: 48 }}
            >
              <span className="text-[16px] font-bold text-zinc-800 w-[161px] text-left">{categoryLabel}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-zinc-700">
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {dropOpen && (
              <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-zinc-200 rounded-[8px] shadow-md min-w-[220px]">
                {CATEGORY_OPTIONS.map((opt) => {
                  const selected = opt.value === category;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setCategory(opt.value); setDropOpen(false); }}
                      className="w-full text-left px-4 py-3 text-[15px] font-medium text-zinc-800 active:bg-zinc-50 transition-colors first:rounded-t-[8px] last:rounded-b-[8px]"
                      style={{
                        backgroundColor: selected ? "#FFF5EC" : undefined,
                        color:           selected ? "#FE6F5E" : undefined,
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {error ? (
        <p className="px-6 mt-10 text-center text-[14px] font-semibold text-coral-700">{error}</p>
      ) : loading ? (
        <LeaderSkeleton />
      ) : !data || data.top.length === 0 ? (
        <EmptyResults />
      ) : (
        <>
          {/* Top 10 */}
          <div className="px-5 mt-10 space-y-[40px]">
            {data.top.map((row) => (
              <LeaderRow key={row.id} row={row} />
            ))}
          </div>

          {/* Separator + viewer's neighbourhood (only when off the top) */}
          {data.viewer && data.viewer.rank > 10 && data.neighbours.length > 0 && (
            <>
              <div className="flex flex-col items-center gap-4 my-6">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              </div>
              <div className="px-5 space-y-[40px]">
                {data.neighbours.map((row) => (
                  <LeaderRow key={row.id} row={row} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function LeaderRow({ row }: { row: LeaderboardRow }) {
  const rankIcon: IconName | null =
    row.rank === 1 ? "leaderboard-first" :
    row.rank === 2 ? "leaderboard-second" :
    row.rank === 3 ? "leaderboard-third" :
    null;

  const isMe = row.is_viewer;
  const displayName = row.display_name || `@${row.handle}`;

  return (
    <div
      className="flex items-center gap-[18px]"
      style={{
        backgroundColor: isMe ? "#FFF5EC" : undefined,
        borderRadius:    isMe ? 12        : undefined,
        padding:         isMe ? "10px 8px" : undefined,
      }}
    >
      {/* Rank — icon for top-3, plain number after */}
      <div className="shrink-0 flex items-center justify-center" style={{ width: 36 }}>
        {rankIcon ? (
          <Icon name={rankIcon} width={36} height={25} />
        ) : (
          <span className="text-[18px] font-bold text-zinc-800 leading-[43px] text-center w-full">
            {row.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <div className="shrink-0 w-[65px] h-[65px] rounded-full overflow-hidden bg-zinc-100">
        <AvatarImage
          url={row.avatar_url}
          name={displayName}
          size={65}
        />
      </div>

      {/* Name + count pill */}
      <div className="flex-1 min-w-0 space-y-3">
        <p
          className="text-[20px] font-bold truncate leading-[43px]"
          style={{ color: isMe ? "#FE6F5E" : "#27272A" }}
        >
          {displayName}
        </p>
        <span
          className="inline-block rounded-[25px] text-[14px] font-semibold leading-[43px]"
          style={{
            backgroundColor: "#F4F4F5",
            color: isMe ? "#FE6F5E" : "#52525B",
            padding: "0 10px",
          }}
        >
          {row.score} ΠΡΟΤΑΣΕΙΣ
        </span>
      </div>

      {isMe && (
        <span
          className="text-[12px] font-bold text-white px-2 py-1 rounded-full shrink-0"
          style={{ backgroundColor: "#FE6F5E" }}
        >
          Εσύ
        </span>
      )}
    </div>
  );
}

function LeaderSkeleton() {
  return (
    <div className="px-5 mt-10 space-y-[40px]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-[18px] animate-pulse">
          <div className="w-9 h-6 rounded bg-zinc-100" />
          <div className="w-[65px] h-[65px] rounded-full bg-zinc-100" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-2/3 rounded bg-zinc-100" />
            <div className="h-4 w-24 rounded-full bg-zinc-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="px-6 mt-12 text-center space-y-2">
      <p className="text-[18px] font-bold text-zinc-800">Δεν υπάρχουν δεδομένα</p>
      <p className="text-[14px] font-medium text-zinc-500">
        Δοκίμασε διαφορετική κατηγορία ή χρονικό διάστημα.
      </p>
    </div>
  );
}
