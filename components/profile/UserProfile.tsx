"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useOverlay } from "@/hooks/useOverlay";
import { FollowersPopupCentered } from "@/components/profile/FollowersPopupCentered";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { Icon } from "@/components/ui/Icon";
import { ProfileScoreCard } from "@/components/profile/ProfileScoreCard";
import { ProfileVotesCard } from "@/components/profile/ProfileVotesCard";

/* ── Inline icons ──────────────────────────────────────────── */

function BookmarkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3.5 2.5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v11.5l-4.5-3-4.5 3V2.5Z" stroke="#71717A" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 19 19" fill="none" aria-hidden>
      <circle cx="9.5" cy="9.5" r="8.5" stroke="#FAFAFA" strokeWidth="1.5" />
      <path d="M9.5 5.5v8M5.5 9.5h8" stroke="#FAFAFA" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Teal shield badge (Verified) ──────────────────────────── */
function TealShieldIcon({ size = 70, uid = "a" }: { size?: number; uid?: string }) {
  const h = Math.round((size / 70) * 78);
  const g1 = `ts-${uid}`;
  const g2 = `ts-star-${uid}`;
  return (
    <svg width={size} height={h} viewBox="0 0 70 78" fill="none" aria-hidden>
      <defs>
        <linearGradient id={g1} x1="9" y1="70" x2="61" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="9%" stopColor="#00B58B" />
          <stop offset="78%" stopColor="rgba(92,237,203,0.56)" />
          <stop offset="100%" stopColor="rgba(92,237,203,0.3)" />
        </linearGradient>
        <linearGradient id={g2} x1="0" y1="15" x2="15" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00B58B" />
          <stop offset="100%" stopColor="rgba(92,237,203,0.1)" />
        </linearGradient>
      </defs>
      <path d="M35 4L6 16.5V37C6 54.5 18.5 68.5 35 74C51.5 68.5 64 54.5 64 37V16.5L35 4Z" fill={`url(#${g1})`} />
      <circle cx="35" cy="29" r="9.5" fill="white" fillOpacity="0.92" />
      <path d="M20 57C20 47.6 26.9 40 35 40C43.1 40 50 47.6 50 57" fill="white" fillOpacity="0.92" />
      <circle cx="58" cy="66" r="8" fill="white" />
      <path d="M58 60.5l1.6 4 3.9.3-3 2.9.9 3.9-3.4-1.9-3.4 1.9.9-3.9-3-2.9 3.9-.3z" fill={`url(#${g2})`} />
    </svg>
  );
}

/* ── Blue shield badge (Expert) ────────────────────────────── */
function BlueShieldIcon({ size = 45 }: { size?: number }) {
  const h = Math.round((size / 45) * 50);
  return (
    <svg width={size} height={h} viewBox="0 0 45 50" fill="none" aria-hidden>
      <defs>
        <linearGradient id="blue-shield" x1="4" y1="45" x2="41" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="9%" stopColor="#0171C7" />
          <stop offset="78%" stopColor="rgba(152,210,254,0.56)" />
          <stop offset="100%" stopColor="rgba(152,210,254,0.1)" />
        </linearGradient>
      </defs>
      <path d="M22.5 2.5L4 10V24C4 34.5 12.2 43.5 22.5 47.5C32.8 43.5 41 34.5 41 24V10L22.5 2.5Z" fill="url(#blue-shield)" />
      <rect x="11" y="19" width="23" height="15" rx="2.5" fill="white" fillOpacity="0.85" />
      <path d="M15 19v-4.5C15 11.5 17.5 9 20.5 9H24.5C27.5 9 30 11.5 30 14.5V19" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85" />
    </svg>
  );
}

/* ── Section header (line · TITLE · line) ──────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="h-px bg-zinc-300 ml-6 shrink-0" style={{ width: 24 }} />
      <p className="flex-1 text-base font-bold text-zinc-700 text-center leading-[130%] uppercase whitespace-pre-line">{title}</p>
      <div className="h-px bg-zinc-300 mr-6 shrink-0" style={{ width: 120 }} />
    </div>
  );
}

/* ── Progress bar (342×170) ─────────────────────────────────── */
function ProgressBar({ avatar, name }: { avatar?: string | null; name?: string }) {
  return (
    <div className="relative" style={{ width: 342, height: 170 }}>
      {/* Milestone dots */}
      <div className="absolute flex gap-[18px] items-center" style={{ left: 50, top: 19 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="shrink-0 rounded-full bg-zinc-200" style={{ width: 3, height: 3 }} />
        ))}
      </div>

      {/* Track background */}
      <div className="absolute rounded-full bg-zinc-200" style={{ left: 41, top: 74, width: 260, height: 12 }} />

      {/* Green fill */}
      <div
        className="absolute rounded-full bg-[#019371]"
        style={{ left: 41, top: 74, width: 75, height: 12, boxShadow: "0px 1px 5px 0px rgba(0, 48, 84, 0.3)" }}
      />

      {/* Verified badge (left, unlocked) */}
      <div className="absolute flex flex-col items-center gap-3" style={{ left: 0, top: 49 }}>
        <TealShieldIcon size={45} uid="progress" />
        <p className="text-[14px] font-medium text-zinc-800 text-center leading-[130%]">Verified</p>
      </div>

      {/* Avatar at progress end point */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{ left: 115, top: 48, width: 50, height: 50, border: "2px solid #FAFAFA", boxShadow: "0px 0px 9px -1px rgba(0,0,0,0.3)" }}
      >
        <AvatarImage url={avatar} name={name} size={50} className="rounded-full" />
      </div>

      {/* Expert badge (right, locked) */}
      <div className="absolute flex flex-col items-center gap-3" style={{ left: 297, top: 48, opacity: 0.5 }}>
        <BlueShieldIcon size={45} />
        <p className="text-[14px] text-zinc-800 text-center leading-[130%]">Expert</p>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────── */
export function UserProfile({
  handle         = "",
  avatarUrl,
  displayName,
  bio,
  suggestionCount = 0,
  ratingCount     = 0,
  bookmarkCount   = 0,
  followersCount  = 0,
  followingCount  = 0,
  level           = 1,
  avgQualityScore = 0,
  voteUpCount     = 0,
  topSuggestion,
}: {
  handle?:         string;
  avatarUrl?:      string;
  displayName?:    string;
  bio?:            string;
  suggestionCount?: number;
  ratingCount?:    number;
  bookmarkCount?:  number;
  followersCount?: number;
  followingCount?: number;
  level?:          number;
  avgQualityScore?: number;
  voteUpCount?:    number;
  topSuggestion?: {
    title: string;
    subtitle: string;
    coverUrl: string | null;
    avgRating: number;
    ratingCount: number;
    href: string;
  } | null;
}) {
  const { openSuggestion } = useOverlay();
  const [popupTab, setPopupTab] = useState<"followers" | "following" | null>(null);
  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const name = displayName ?? handle ?? "—";

  // Next level milestone
  const nextMilestone = suggestionCount < 3 ? 3 : suggestionCount < 10 ? 10 : null;
  const toNextLevel   = nextMilestone ? nextMilestone - suggestionCount : 0;

  // Split "First Last" into two lines for the hero; single names stay on one line
  const nameParts  = name.trim().split(/\s+/);
  const nameDisplay =
    nameParts.length >= 2
      ? `${nameParts[0]}\n${nameParts.slice(1).join(" ")}`
      : name;

  return (
    <div className="bg-white pb-28">

      {/* ── 1. Profile Hero ─────────────────────────────────── */}
      <div
        className="px-5 pt-10"
        style={{ background: "linear-gradient(180deg, #F2F2F7 0%, rgba(242,242,247,0) 100%)", minHeight: 160 }}
      >
        <div className="flex items-start gap-3">
          <div
            className="relative shrink-0 rounded-full overflow-hidden"
            style={{ width: 80, height: 80, outline: "2px solid #FAFAFA", boxShadow: "0px 0px 9px -1px rgba(0,0,0,0.3)" }}
          >
            <AvatarImage url={avatarUrl} name={name} size={80} className="rounded-full" />
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-[24px] font-bold text-zinc-700 leading-[110%] whitespace-pre-line">
              {nameDisplay}
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPopupTab("followers")}
                className="text-zinc-800 leading-[17px] active:opacity-70 transition-opacity"
              >
                <strong className="text-[18px] font-bold">{followersCount}</strong>{" "}
                <strong className="text-sm font-bold">Ακόλουθοι</strong>
              </button>
              <button
                onClick={() => setPopupTab("following")}
                className="text-zinc-800 leading-[17px] active:opacity-70 transition-opacity"
              >
                <strong className="text-[18px] font-bold">{followingCount}</strong>{" "}
                <strong className="text-sm font-bold">Ακολουθώ</strong>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Badge Row ────────────────────────────────────── */}
      <div className="flex items-center justify-center px-5 mt-2">
        {/* Left wreath leaves */}
        <Icon name="profile-leaves-left" width={127} height={134} alt="" className="shrink-0" />

        {/* Main badge (design-system verified hexagon + label) */}
        <div className="flex flex-col items-center gap-4 shrink-0 z-10 -mx-6">
          <Icon name="badge-verified" width={84} height={94} alt="" />
          <p className="text-[18px] font-bold text-zinc-700 text-center leading-[130%] whitespace-pre-line">
            {"Verified\nMember"}
          </p>
        </div>

        {/* Right wreath leaves */}
        <Icon name="profile-leaves-right" width={127} height={134} alt="" className="shrink-0" />
      </div>

      {/* ── 3. GeneralStats ─────────────────────────────────── */}
      <div className="px-5 mt-4">
        <div
          className="flex items-stretch justify-between rounded-lg border border-zinc-200"
          style={{ padding: "12px 16px" }}
        >
          {/* Suggestions — taps → suggestions overview */}
          <Link href={`/profile/${handle}/suggestions`} className="flex-1 flex flex-col items-center gap-4 active:opacity-70 transition-opacity">
            <div className="flex flex-col items-center gap-3">
              <Icon name="profile-suggestions" width={16} height={16} alt="" />
              <span className="text-[13px] font-medium text-zinc-500 tracking-[0.6%] uppercase">ΠΡΟΤΑΣΕΙΣ</span>
            </div>
            <span className="text-[24px] font-bold text-zinc-800 leading-none">{suggestionCount}</span>
          </Link>

          {/* Vertical divider */}
          <div className="w-px bg-zinc-200 mx-1" />

          {/* Reviews — taps → reviews overview */}
          <Link href={`/profile/${handle}/reviews`} className="flex-1 flex flex-col items-center gap-4 active:opacity-70 transition-opacity">
            <div className="flex flex-col items-center gap-3">
              <Icon name="profile-reviews-star" width={15} height={14} alt="" />
              <span className="text-[13px] font-medium text-zinc-500 tracking-[0.6%] uppercase">ΑΞΙΟΛΟΓΗΣΕΙΣ</span>
            </div>
            <span className="text-[24px] font-bold text-zinc-800 leading-none">{ratingCount}</span>
          </Link>

          {/* Vertical divider */}
          <div className="w-px bg-zinc-200 mx-1" />

          {/* Bookmarks — own profile only (RLS blocks others) */}
          <Link href={`/profile/${handle}/bookmarks`} className="flex-1 flex flex-col items-center gap-4 active:opacity-70 transition-opacity">
            <div className="flex flex-col items-center gap-3">
              <BookmarkIcon size={15} />
              <span className="text-[13px] font-medium text-zinc-500 tracking-[0.6%] uppercase">ΑΓΑΠΗΜΕΝΑ</span>
            </div>
            <span className="text-[24px] font-bold text-zinc-800 leading-none">{bookmarkCount}</span>
          </Link>
        </div>
      </div>

      {/* ── 4. First suggestion CTA (shown only when 0 suggestions) ── */}
      {suggestionCount === 0 && (
        <div className="px-6 mt-6">
          <div
            className="flex flex-col items-center gap-3 rounded-xl"
            style={{ backgroundColor: "#FFF6EC", padding: "24px 12px" }}
          >
            <div className="flex items-center gap-2.5 self-stretch">
              <div className="relative shrink-0 overflow-hidden rounded-sm" style={{ width: 60, height: 60 }}>
                <Image src="/images/profile-status.gif" alt="" fill className="object-cover" unoptimized />
              </div>
              <p className="text-base font-semibold text-zinc-700 leading-[130%]">
                Κάνε την πρώτη σου<br />πρόταση και ξεκίνα!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Statistics (horizontal scroll) ──────────────── */}
      <div className="mt-6 overflow-x-auto">
        <div className="flex gap-5 px-5 pb-1 w-max">
          <ProfileScoreCard
            score={avgQualityScore}
            count={ratingCount}
            href={`/profile/${handle}/reviews`}
          />
          <ProfileVotesCard
            votes={voteUpCount}
            href={`/profile/${handle}/reviews`}
          />
          <div className="w-1 shrink-0" />
        </div>
      </div>

      {/* ── 6. MakeSuggestion ───────────────────────────────── */}
      <div className="flex flex-col items-center gap-8" style={{ padding: "40px 24px" }}>
        {nextMilestone ? (
          <p className="text-[26px] text-zinc-800 leading-[130%] text-center">
            <span className="font-normal">Σε </span>
            <span className="font-extrabold">{toNextLevel} {toNextLevel === 1 ? "πρόταση" : "προτάσεις"} </span>
            <span className="font-bold">ανεβαίνεις</span>
            <br />
            <span className="font-bold">στο επόμενο επίπεδο!</span>
          </p>
        ) : (
          <p className="text-[26px] font-bold text-zinc-800 leading-[130%] text-center">
            Είσαι Expert! 🎉
          </p>
        )}

        <ProgressBar avatar={avatarUrl} name={name} />

        <div className="flex flex-col items-center gap-6 w-full">
          <p className="text-base font-semibold text-zinc-700 leading-[130%] text-center">
            Βοήθησε και άλλους χρήστες να <br />ανακαλύψουν νέες προτάσεις
          </p>
          <button
            onClick={() => openSuggestion()}
            className="w-full flex items-center justify-center gap-2 rounded-lg active:opacity-80 transition-opacity"
            style={{
              backgroundColor: "#27272A",
              border: "1px solid #27272A",
              padding: "16px 22px",
              boxShadow: "2px 2px 11px -3px rgba(0,0,0,0.25)",
            }}
          >
            <PlusCircleIcon />
            <span className="text-xl font-bold text-[#FAFAFA]">Νέα πρόταση</span>
          </button>
        </div>
      </div>

      {/* ── 7. Highest Rating (shown only when user has a top suggestion) ── */}
      {topSuggestion && <div className="flex flex-col items-center gap-8">
        <SectionHeader title={"ΠΡΟΤΑΣΗ ΜΕ ΤΗΝ\nΥΨΗΛΟΤΕΡΗ ΒΑΘΜΟΛΟΓΙΑ"} />

        <div className="px-6 w-full">
          <div className="overflow-hidden border border-zinc-200 rounded-lg">
            {topSuggestion.coverUrl && (
              <div className="relative" style={{ height: 227 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={topSuggestion.coverUrl}
                  alt={topSuggestion.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
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

              <a href={topSuggestion.href} className="text-base font-semibold text-zinc-700 underline">
                Δες την πρόταση
              </a>
            </div>
          </div>
        </div>
      </div>}

      {/* ── 9. Leaderboard CTA ─────────────────────────────── */}
      <div className="px-5 mt-10">
        <Link
          href="/leaderboard"
          className="flex items-center justify-between rounded-[12px] border border-zinc-200 bg-zinc-50 active:bg-zinc-100 transition-colors"
          style={{ padding: "16px 20px" }}
        >
          <div className="flex items-center gap-3">
            <TrophyIcon />
            <div className="space-y-1">
              <p className="text-[16px] font-bold text-zinc-800">Leaderboard</p>
              <p className="text-[13px] font-medium text-zinc-500">Παγκόσμια κατάταξη <span className="text-[#FE6F5E] font-bold">#84</span></p>
            </div>
          </div>
          <ChevronRightIcon />
        </Link>
      </div>

      {/* ── 10. Settings ────────────────────────────────────── */}
      <div className="px-5 mt-10 space-y-8 pb-10">
        <SettingsGroup label="ΛΟΓΑΡΙΑΣΜΟΣ" items={[
          { icon: <SettingIconUser />,   label: "Επεξεργασία Προφίλ",    href: `/profile/${handle}/settings/edit` },
          { icon: <SettingIconLock />,   label: "Σύνδεση & Ασφάλεια",    href: `/profile/${handle}/settings/security` },
        ]} />
        <SettingsGroup label="ΠΡΟΤΙΜΗΣΕΙΣ" items={[
          { icon: <SettingIconBell />,   label: "Ειδοποιήσεις",            href: `/profile/${handle}/settings/notifications` },
          { icon: <SettingIconSparkle />,label: "Προσωποποιημένη Εμπειρία",href: `/profile/${handle}/settings/personalization` },
        ]} />
        <SettingsGroup label="ΥΠΟΣΤΗΡΙΞΗ" items={[
          { icon: <SettingIconHelp />,   label: "Κέντρο Βοήθειας",        href: "/support" },
          { icon: <SettingIconMail />,   label: "Επικοινωνία",             href: "/support" },
        ]} />

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-[8px] bg-zinc-100 active:bg-zinc-200 transition-colors"
          style={{ padding: "9px 12px", height: 72 }}
        >
          <SettingIconLogout />
          <span className="text-[18px] font-semibold" style={{ color: "#EC2525" }}>Αποσύνδεση</span>
        </button>
      </div>

      {popupTab && (
        <FollowersPopupCentered
          initialTab={popupTab}
          onClose={() => setPopupTab(null)}
        />
      )}
    </div>
  );
}

/* ── Settings helpers ─────────────────────────────────────────────── */

function SettingsGroup({ label, items }: { label: string; items: { icon: React.ReactNode; label: string; href: string }[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-semibold text-zinc-500 uppercase tracking-[0.8px] px-1 pb-1">{label}</p>
      <div className="space-y-2">
        {items.map((item, i) => (
          <Link key={i} href={item.href}
            className="flex items-center gap-3 rounded-[8px] bg-zinc-100 active:bg-zinc-200 transition-colors"
            style={{ padding: "9px 12px", height: 72 }}>
            <div className="w-8 h-[26px] flex items-center justify-center shrink-0">{item.icon}</div>
            <span className="flex-1 text-[18px] font-semibold text-zinc-800">{item.label}</span>
            <ChevronRightIcon />
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── New icons ────────────────────────────────────────────────────── */

function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FE6F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2"/><path d="M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2"/>
      <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return <svg width="8" height="14" viewBox="0 0 8 14" fill="none" aria-hidden><path d="M1 1l6 6-6 6" stroke="#71717A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function SettingIconUser() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}

function SettingIconLock() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
}

function SettingIconBell() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>;
}

function SettingIconSparkle() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>;
}

function SettingIconHelp() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>;
}

function SettingIconMail() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
}

function SettingIconLogout() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#EC2525"/><polyline points="16 17 21 12 16 7" stroke="#EC2525"/><line x1="21" y1="12" x2="9" y2="12" stroke="#EC2525"/></svg>;
}
