"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { CATEGORIES as CAT_LIST } from "@/constants/categories";

type Period = "all" | "month" | "week";

const PERIODS: { key: Period; label: string }[] = [
  { key: "all",   label: "Όλη τη διάρκεια" },
  { key: "month", label: "Τελευταίο μήνα" },
  { key: "week",  label: "Τελευταία εβδομάδα" },
];

const TOP_USERS = [
  { rank: 1,  name: "Μιχάλης Νάσης",           suggestions: 49, avatar: "/images/profile-avatar.png" },
  { rank: 2,  name: "Konstantina Foutzitzi",    suggestions: 44, avatar: "/images/profile-avatar.png" },
  { rank: 3,  name: "Evita Danelaki",           suggestions: 39, avatar: "/images/profile-avatar.png" },
  { rank: 4,  name: "Kostas Papageorgiou",      suggestions: 35, avatar: "/images/profile-avatar.png" },
  { rank: 5,  name: "Lefteris Tzagk.",          suggestions: 34, avatar: "/images/profile-avatar.png" },
  { rank: 6,  name: "Κατερίνα Κυριακοπούλου",  suggestions: 34, avatar: "/images/profile-avatar.png" },
  { rank: 7,  name: "Nikos Avramidis",          suggestions: 31, avatar: "/images/profile-avatar.png" },
  { rank: 8,  name: "Pyrros Maggos",            suggestions: 28, avatar: "/images/profile-avatar.png" },
  { rank: 9,  name: "Don Tomis",                suggestions: 26, avatar: "/images/profile-avatar.png" },
  { rank: 10, name: "Eva Papaioannou",          suggestions: 24, avatar: "/images/profile-avatar.png" },
];

const MY_POSITION = [
  { rank: 189, name: "Daniel Schwenker",        suggestions: 14, avatar: "/images/profile-avatar.png", isMe: false },
  { rank: 190, name: "Stavroula Kyriakopoulou", suggestions: 13, avatar: "/images/profile-avatar.png", isMe: true  },
];

const CATEGORIES = ["Όλες οι κατηγορίες", ...CAT_LIST.map((c) => c.labelEl)];

export function LeaderboardPage() {
  const router = useRouter();
  const [period, setPeriod]     = useState<Period>("all");
  const [category, setCategory] = useState("Όλες οι κατηγορίες");
  const [dropOpen, setDropOpen] = useState(false);

  return (
    <div className="pb-24">

      <InnerHeader title="Leaderboard" onBack={() => router.back()} />

      {/* Hero */}
      <div className="px-6 pt-8 flex items-center gap-3 justify-between">
        <div className="space-y-4 flex-1">
          <p className="text-[36px] font-extrabold text-zinc-800 leading-[48px]">Leaderboard</p>
          <p className="text-[16px] font-medium text-zinc-800 leading-[130%]">Ανακάλυψε τους χρήστες με τη<br />μεγαλύτερη συμμετοχή</p>
        </div>
        <LargeTrophyIcon />
      </div>

      {/* Filters */}
      <div className="mt-10 space-y-8">

        {/* Period pills */}
        <div className="space-y-4 px-6">
          <p className="text-[18px] font-bold text-zinc-800">Διάρκεια</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-hide">
            {PERIODS.map(p => {
              const active = period === p.key;
              return (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className="shrink-0 rounded-[50px] active:opacity-80 transition-opacity"
                  style={{
                    padding: "16px 14px",
                    backgroundColor: active ? "#3F3F46" : "#FFFFFF",
                    border: active ? "none" : "1px solid #D4D4D8",
                    opacity: active ? 0.9 : 1,
                  }}>
                  <span className={`text-[14px] whitespace-nowrap ${active ? "font-bold" : "font-semibold"}`}
                    style={{ color: active ? "#FAFAFA" : "#3F3F46" }}>{p.label}</span>
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
              onClick={() => setDropOpen(v => !v)}
              className="flex items-center gap-1 rounded-[8px] active:opacity-80 transition-opacity"
              style={{ padding: "6px 8px 6px 16px", border: "1.5px solid #A1A1AA", height: 48 }}>
              <span className="text-[16px] font-bold text-zinc-800 w-[161px] text-left">{category}</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-zinc-700"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            {dropOpen && (
              <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-zinc-200 rounded-[8px] shadow-md min-w-[200px]">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setCategory(cat); setDropOpen(false); }}
                    className="w-full text-left px-4 py-3 text-[15px] font-medium text-zinc-800 active:bg-zinc-50 transition-colors first:rounded-t-[8px] last:rounded-b-[8px]"
                    style={{ backgroundColor: cat === category ? "#FFF5EC" : undefined, color: cat === category ? "#FE6F5E" : undefined }}>
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 10 */}
      <div className="px-5 mt-10 space-y-[40px]">
        {TOP_USERS.map(user => (
          <LeaderRow key={user.rank} {...user} isMe={false} />
        ))}
      </div>

      {/* Separator */}
      <div className="flex flex-col items-center gap-4 my-6">
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
      </div>

      {/* My position */}
      <div className="px-5 space-y-[40px]">
        {MY_POSITION.map(user => (
          <LeaderRow key={user.rank} {...user} />
        ))}
      </div>
    </div>
  );
}

function LeaderRow({ rank, name, suggestions, avatar, isMe }: {
  rank: number; name: string; suggestions: number; avatar: string; isMe: boolean;
}) {
  const isTop3 = rank <= 3;
  const laurelColor = rank === 1 ? "#FDD258" : rank === 2 ? "#C0C0C0" : rank === 3 ? "#CD7F32" : null;

  return (
    <div className="flex items-center gap-[18px]"
      style={{ backgroundColor: isMe ? "#FFF5EC" : undefined, borderRadius: isMe ? 12 : undefined, padding: isMe ? "10px 8px" : undefined }}>

      {/* Rank */}
      <div className="shrink-0 flex items-center justify-center" style={{ width: isTop3 ? 36 : 32 }}>
        {isTop3 && laurelColor ? (
          <div className="flex items-center justify-between w-full">
            <LaurelIcon color={laurelColor} />
            <span className={`text-[${rank === 1 ? 20 : 18}px] font-bold text-zinc-800 leading-[43px]`}>{rank}</span>
            <LaurelIcon color={laurelColor} flipped />
          </div>
        ) : (
          <span className="text-[18px] font-bold text-zinc-800 leading-[43px] text-center w-full">{rank}</span>
        )}
      </div>

      {/* Avatar */}
      <div className="shrink-0 w-[65px] h-[65px] rounded-full overflow-hidden bg-zinc-100">
        <Image src={avatar} alt={name} width={65} height={65} className="object-cover w-full h-full" />
      </div>

      {/* Name + suggestion count pill */}
      <div className="flex-1 min-w-0 space-y-3">
        <p className="text-[20px] font-bold truncate leading-[43px]" style={{ color: isMe ? "#FE6F5E" : "#27272A" }}>{name}</p>
        <span
          className="inline-block rounded-[25px] text-[14px] font-semibold leading-[43px]"
          style={{ backgroundColor: "#F4F4F5", color: isMe ? "#FE6F5E" : "#52525B", padding: "0 10px" }}
        >
          {suggestions} ΠΡΟΤΑΣΕΙΣ
        </span>
      </div>

      {isMe && (
        <span className="text-[12px] font-bold text-white px-2 py-1 rounded-full shrink-0" style={{ backgroundColor: "#FE6F5E" }}>Εσύ</span>
      )}
    </div>
  );
}

function LaurelIcon({ color = "#C0C0C0", flipped }: { color?: string; flipped?: boolean }) {
  return (
    <svg width="15" height="25" viewBox="0 0 15 25" fill="none" aria-hidden
      style={flipped ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M13.5 1C11 4.5 9.5 9 9.5 13.5C9.5 18 11 22 13.5 24" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M12 3.5C9.5 5.5 8.5 8 9.5 10.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M11 9C8.5 10 7.5 12.5 8.5 15" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M11 14.5C8.5 15.5 7.5 18 8.5 20.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function LargeTrophyIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 160 160" fill="none" aria-hidden>
      <circle cx="80" cy="80" r="70" fill="#FFF5EC" />
      <path d="M80 30L62 50H35v28c0 15 12 28 27 28h36c15 0 27-13 27-28V50H98L80 30z" fill="#FDD258" stroke="#E5B800" strokeWidth="1.5"/>
      <path d="M35 58c-8 0-14 6-14 14s6 14 14 14" stroke="#E5B800" strokeWidth="2" fill="none"/>
      <path d="M125 58c8 0 14 6 14 14s-6 14-14 14" stroke="#E5B800" strokeWidth="2" fill="none"/>
      <path d="M65 108v12h30v-12H65z" fill="#FDD258"/>
      <path d="M55 120h50" stroke="#E5B800" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
