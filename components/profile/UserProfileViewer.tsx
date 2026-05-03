"use client";

import { useState } from "react";
import { FollowersPopupCentered } from "@/components/profile/FollowersPopupCentered";
import { AvatarImage } from "@/components/ui/AvatarImage";

/* ── Icons ──────────────────────────────────────────────────── */

function StarIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.93} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill="#27272A" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M11.333 2a1.885 1.885 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2Z" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.333 3.667l2 2" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PersonPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="6" cy="4.5" r="2.75" stroke="white" strokeWidth="1.5" />
      <path d="M1 14c0-3 2-5 5-5s5 2 5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 7v4M11 9h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function FlameIcon() {
  return (
    <svg width="25" height="24" viewBox="0 0 25 24" fill="none" aria-hidden>
      <path d="M13 2C13 2 7.5 8.5 7.5 13.5C7.5 16.5 10 19 13 19C16 19 18.5 16.5 18.5 13.5C18.5 8.5 13 2 13 2Z" fill="#FF9F00" />
      <path d="M13 10C13 10 10.5 12.5 10.5 14.5C10.5 16 11.6 17.2 13 17.2C14.4 17.2 15.5 16 15.5 14.5C15.5 12.5 13 10 13 10Z" fill="#FF7816" />
      <path d="M8.5 13.5C8.5 16 10 18 10 18C8 18.5 5 18 4 15.5C3.5 14 5.5 12 8 11C7.5 11.5 7.5 13.5 8.5 13.5Z" fill="#FDBF00" />
    </svg>
  );
}

function ThumbUpSmall() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" fill="#FFBA9F" />
      <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="#E0A58D" />
    </svg>
  );
}

function ThumbUpBigIcon() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden>
      <path d="M33 57H21C18.8 57 17 58.8 17 61V97C17 99.2 18.8 101 21 101H33C35.2 101 37 99.2 37 97V61C37 58.8 35.2 57 33 57Z" fill="#FFBA9F" />
      <path d="M22 99.5h11" stroke="#E0A58D" strokeWidth="3" strokeLinecap="round" />
      <path d="M37 63L56 27C58.5 21.5 64.5 20.5 68.5 24.5L70 26C73 29 73.5 35 71 39L62 57H91C94 57 97 59.5 97.5 63L99 76C99.5 81.5 96 87 91 87.5H71.5L72.5 95C73 100.5 69 105 63.5 105H52C48 105 44 102.5 42 98L37 79V63Z" fill="#FFBA9F" />
      <circle cx="26" cy="42" r="14" fill="#FDCD56" />
      <path d="M26 34l2 5.5 5.8.3-4.7 3.4 1.7 5.5-4.8-2.7-4.8 2.7 1.7-5.5-4.7-3.4 5.8-.3z" fill="white" />
    </svg>
  );
}

/* ── Gold shield badge ──────────────────────────────────────── */
function GoldShieldIcon({ uid = "a" }: { uid?: string }) {
  const g1 = `gold-${uid}`;
  const g2 = `gold-star-${uid}`;
  return (
    <svg width={70} height={78} viewBox="0 0 70 78" fill="none" aria-hidden>
      <defs>
        <linearGradient id={g1} x1="9" y1="70" x2="61" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="9%"  stopColor="rgba(255,191,120,1)" />
          <stop offset="78%" stopColor="rgba(255,238,169,0.56)" />
          <stop offset="100%" stopColor="rgba(254,255,210,0.1)" />
        </linearGradient>
        <linearGradient id={g2} x1="0" y1="15" x2="15" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,191,120,1)" />
          <stop offset="100%" stopColor="rgba(255,191,120,0.1)" />
        </linearGradient>
      </defs>
      {/* Shield */}
      <path d="M35 4L6 16.5V37C6 54.5 18.5 68.5 35 74C51.5 68.5 64 54.5 64 37V16.5L35 4Z" fill={`url(#${g1})`} />
      {/* Crown (centered at ~17,23 within shield, 36×28) */}
      <g transform="translate(17,23)">
        <path d="M0 20L0 6L9 14L18 0L27 14L36 6L36 20Z" fill="#FF7D29" />
        <rect x="2.23" y="22" width="31.89" height="5" rx="1" fill="#FF7D29" />
      </g>
      {/* Corner star badge */}
      <circle cx="58" cy="66" r="8" fill="white" />
      <path d="M58 60.5l1.6 4 3.9.3-3 2.9.9 3.9-3.4-1.9-3.4 1.9.9-3.9-3-2.9 3.9-.3z" fill={`url(#${g2})`} />
    </svg>
  );
}

/* ── Section header ─────────────────────────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="h-px bg-zinc-300 ml-6 shrink-0" style={{ width: 24 }} />
      <p className="flex-1 text-base font-bold text-zinc-700 text-center leading-[130%] uppercase whitespace-pre-line">{title}</p>
      <div className="h-px bg-zinc-300 mr-6 shrink-0" style={{ width: 120 }} />
    </div>
  );
}

/* ── Rating bar row ─────────────────────────────────────────── */
function RatingBarRow({ stars, percent }: { stars: number; percent: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 shrink-0" style={{ width: 28 }}>
        <span className="text-base font-semibold text-zinc-800">{stars}</span>
        <StarIcon size={12} />
      </div>
      <div
        className="relative flex-1 rounded-full overflow-hidden"
        style={{ height: 10, backgroundColor: "#E1E1E2", boxShadow: "inset 1px 1px 4px 0px rgba(0,0,0,0.25)" }}
      >
        <div
          className="h-full rounded-full bg-[#019371]"
          style={{ width: `${percent}%`, boxShadow: "0px 1px 5px 0px rgba(0, 48, 84, 0.3)" }}
        />
      </div>
      <span className="text-base font-bold text-zinc-800 shrink-0 text-right" style={{ width: 32 }}>
        {percent}%
      </span>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
interface TopSuggestionData {
  title: string;
  subtitle: string;
  coverUrl: string | null;
  avgRating: number;
  ratingCount: number;
  href: string;
}

interface UserProfileViewerProps {
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  suggestionCount: number;
  ratingCount: number;
  level: number;
  avgRating: number;
  followerCount: number;
  followingCount: number;
  topSuggestion?: TopSuggestionData | null;
}

export function UserProfileViewer({
  displayName,
  avatarUrl,
  suggestionCount,
  ratingCount,
  avgRating,
  followerCount,
  followingCount,
  topSuggestion,
}: UserProfileViewerProps) {
  const [following, setFollowing] = useState(false);
  const [popupTab, setPopupTab] = useState<"followers" | "following" | null>(null);

  return (
    <div className="bg-white pb-28">

      {/* ── 1. Profile Hero ─────────────────────────────────── */}
      <div
        style={{ background: "linear-gradient(180deg, #F2F2F7 0%, rgba(242,242,247,0) 100%)", padding: "32px 20px" }}
        className="flex flex-col gap-8"
      >
        {/* Follow button row (centered, 56px tall container) */}
        <div className="flex justify-center items-center" style={{ height: 56 }}>
          <button
            onClick={() => setFollowing((f) => !f)}
            className="flex items-center justify-center gap-2 rounded-full active:opacity-80 transition-all"
            style={{
              width: 220,
              height: 48,
              backgroundColor: following ? "transparent" : "#27272A",
              border: "1px solid #27272A",
            }}
          >
            {following ? (
              <span className="text-lg font-semibold text-zinc-800">Ακολουθείς</span>
            ) : (
              <>
                <PersonPlusIcon />
                <span className="text-lg font-semibold text-white">Ακολούθησε</span>
              </>
            )}
          </button>
        </div>

        {/* Avatar + name + followers */}
        <div className="flex items-center gap-3">
          <div
            className="relative shrink-0 rounded-full overflow-hidden"
            style={{ width: 80, height: 80, outline: "2px solid #FAFAFA", boxShadow: "0px 0px 9px -1px rgba(0,0,0,0.3)" }}
          >
            <AvatarImage url={avatarUrl} name={displayName} size={80} className="rounded-full" />
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-[24px] font-bold text-zinc-800 leading-[110%]">
              {displayName}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPopupTab("followers")}
                className="text-zinc-700 leading-[17px] active:opacity-70 transition-opacity"
              >
                <strong className="text-[18px] font-bold">{followerCount}</strong>{" "}
                <strong className="text-sm font-bold">Ακόλουθοι</strong>
              </button>
              <button
                onClick={() => setPopupTab("following")}
                className="text-zinc-700 leading-[17px] active:opacity-70 transition-opacity"
              >
                <strong className="text-[18px] font-bold">{followingCount}</strong>{" "}
                <strong className="text-sm font-bold">Ακολουθεί</strong>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Badge Row ────────────────────────────────────── */}
      <div className="flex items-end justify-start px-5 mt-2">
        {/* Left decorative circles */}
        <div className="relative shrink-0" style={{ width: 100, height: 134 }}>
          {([
            { x: 4, y: 23, r: 13 }, { x: 30, y: 27, r: 12 }, { x: 29, y: 50, r: 12 },
            { x: 37, y: 68, r: 12 }, { x: 47, y: 86, r: 12 }, { x: 24, y: 4,  r: 12 },
            { x: 0, y: 44, r: 14 }, { x: 1,  y: 65, r: 15 }, { x: 7,  y: 85, r: 15 },
            { x: 21, y: 103, r: 15 },
          ] as { x: number; y: number; r: number }[]).map((c, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-zinc-100"
              style={{ left: c.x, top: c.y, width: c.r * 1.6, height: c.r * 1.6 }}
            />
          ))}
        </div>

        {/* Gold badge */}
        <div className="flex flex-col items-center gap-4 shrink-0 z-10 -mx-6">
          <GoldShieldIcon uid="badge" />
          <p
            className="text-[18px] font-semibold text-center leading-[130%] whitespace-pre-line"
            style={{ color: "#371600" }}
          >
            {suggestionCount >= 10 ? "EXPERT\nMEMBER" : suggestionCount >= 3 ? "GOLD\nMEMBER" : "MEMBER"}
          </p>
        </div>

        {/* Right decorative circles */}
        <div className="relative shrink-0" style={{ width: 100, height: 134 }}>
          {([
            { x: 56, y: 23, r: 13 }, { x: 32, y: 27, r: 12 }, { x: 33, y: 50, r: 12 },
            { x: 24, y: 68, r: 12 }, { x: 14, y: 86, r: 12 }, { x: 38, y: 4,  r: 12 },
            { x: 58, y: 44, r: 14 }, { x: 54, y: 65, r: 15 }, { x: 47, y: 85, r: 15 },
            { x: 33, y: 103, r: 15 },
          ] as { x: number; y: number; r: number }[]).map((c, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-zinc-100"
              style={{ left: c.x, top: c.y, width: c.r * 1.6, height: c.r * 1.6 }}
            />
          ))}
        </div>
      </div>

      {/* ── 3. GeneralStats ─────────────────────────────────── */}
      <div className="px-5 mt-4">
        <div
          className="flex items-center justify-between rounded-lg border border-zinc-200"
          style={{ padding: "12px 24px" }}
        >
          {/* Suggestions */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <PencilIcon />
              <span className="text-base font-medium text-zinc-500 uppercase tracking-[0.6%]">ΠΡΟΤΑΣΕΙΣ</span>
            </div>
            <span className="text-[26px] font-bold text-zinc-800 leading-none">{suggestionCount}</span>
          </div>

          {/* Vertical divider */}
          <div className="w-px bg-zinc-200" style={{ height: 83 }} />

          {/* Reviews */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <StarIcon size={15} />
              <span className="text-base font-medium text-zinc-500 uppercase tracking-[0.6%]">ΑΞΙΟΛΟΓΗΣΕΙΣ</span>
            </div>
            <span className="text-[24px] font-bold text-zinc-800 leading-none">{ratingCount}</span>
          </div>
        </div>
      </div>

      {/* ── 4. Statistics (horizontal scroll) ──────────────── */}
      <div className="mt-12 overflow-x-auto">
        <div className="flex gap-5 px-6 pb-1 w-max">
          {/* Rating card */}
          <div
            className="shrink-0 flex flex-col gap-5 rounded-lg border border-zinc-300 bg-white"
            style={{ padding: "24px 20px", minWidth: 220 }}
          >
            <div className="flex items-end gap-1">
              <span className="text-base font-semibold text-zinc-800">Συνολική Βαθμολογία</span>
              <StarIcon size={12} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[36px] font-extrabold text-zinc-800 leading-none">{avgRating > 0 ? avgRating.toFixed(2) : "-"}</span>
              <FlameIcon />
            </div>
            <p className="text-sm font-semibold text-zinc-600 underline">
              Δες και τις 5 τις βαθμολογίες
            </p>
          </div>

          {/* Votes card */}
          <div
            className="shrink-0 flex flex-col gap-5 rounded-lg border border-zinc-300 bg-white"
            style={{ padding: "24px 20px", minWidth: 220 }}
          >
            <div className="flex items-center gap-1">
              <span className="text-base font-semibold text-zinc-800">Θετικές ψήφοι</span>
              <ThumbUpSmall />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[36px] font-extrabold text-zinc-800 leading-none">—</span>
              <ThumbUpSmall />
            </div>
            <p className="text-sm font-semibold text-zinc-600 underline">Δες όλες τις αξιολογήσεις</p>
          </div>

          <div className="w-1 shrink-0" />
        </div>
      </div>

      {/* ── 5. Highest Rating ───────────────────────────────── */}
      {topSuggestion && (
        <div className="flex flex-col items-center gap-8 mt-12">
          <SectionHeader title={"ΠΡΟΤΑΣΗ ΜΕ ΤΗΝ\nΥΨΗΛΟΤΕΡΗ ΒΑΘΜΟΛΟΓΙΑ"} />

          <div className="px-6 w-full">
            <div className="overflow-hidden border border-zinc-200 rounded-lg">
              {topSuggestion.coverUrl && (
                <div className="relative" style={{ height: 227 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={topSuggestion.coverUrl} alt={topSuggestion.title} className="absolute inset-0 w-full h-full object-cover" />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(167deg, rgba(255,255,255,1) 63%, rgba(255,255,255,0) 100%)" }}
                  />
                </div>
              )}

              <div className="flex flex-col items-center gap-12 py-8">
                <div className="flex flex-col items-center gap-3 w-full text-center px-4">
                  <p className="text-xl font-bold text-zinc-700">{topSuggestion.title}</p>
                  <p className="text-base font-semibold text-zinc-600">{topSuggestion.subtitle}</p>
                </div>

                <div className="flex flex-col gap-8 w-full px-6">
                  <div className="flex items-center gap-2">
                    <svg width="29" height="28" viewBox="0 0 29 28" fill="none" aria-hidden>
                      <path d="M14.5 2L17.7 9.6L26 10.5L20 16.3L21.7 24.6L14.5 20.6L7.3 24.6L9 16.3L3 10.5L11.3 9.6L14.5 2Z" fill="#27272A" />
                    </svg>
                    <span className="text-[40px] font-extrabold text-zinc-800 leading-none">
                      {topSuggestion.avgRating > 0 ? topSuggestion.avgRating.toFixed(2) : "—"}
                    </span>
                  </div>
                  {topSuggestion.ratingCount > 0 && (
                    <p className="text-[18px] font-semibold text-zinc-700 leading-[130%]">
                      {topSuggestion.ratingCount} κριτικές από <br />αληθινούς χρήστες
                    </p>
                  )}
                </div>

                <a href={topSuggestion.href} className="text-base font-semibold text-zinc-700 underline">Δες την πρόταση</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {popupTab && (
        <FollowersPopupCentered
          initialTab={popupTab}
          onClose={() => setPopupTab(null)}
        />
      )}
    </div>
  );
}
