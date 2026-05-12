"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { FollowersPopupCentered } from "@/components/profile/FollowersPopupCentered";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { Icon } from "@/components/ui/Icon";
import { badgeIconForSuggestions, badgeLabelForSuggestions } from "@/lib/icons";
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

/**
 * ── Progress bar ─────────────────────────────────────────────
 *
 * Track from the user's current tier badge to the next one. The
 * avatar sits on the track at the exact progress position:
 *
 *   [Verified] ════════════[avatar]· · · · · · · [Expert]
 *
 * - Solid bar from left badge to avatar (current tier's color)
 * - Dashed dots from avatar to right badge (tier locked)
 * - Sparkles twinkle around each badge (staggered, slow)
 * - Avatar bobs vertically (2.4s loop, ~4px)
 *
 * Edge cases handled:
 *   - 0–2 suggestions → no current tier; placeholder shield on the
 *     left, Verified on the right
 *   - ≥50 suggestions → top tier reached; callers render the "Είσαι
 *     Platinum 🎉" copy + skip this bar entirely
 */

interface TierDef {
  min:   number;
  icon:  "badge-verified" | "badge-gold" | "badge-expert" | "badge-platinum";
  label: string;
  color: string;
}

const PROGRESS_TIERS: TierDef[] = [
  { min: 3,  icon: "badge-verified", label: "Verified", color: "#1D9E75" },
  { min: 10, icon: "badge-gold",     label: "Έμπειρος", color: "#3B82F6" },
  { min: 25, icon: "badge-expert",   label: "Expert",   color: "#7C3AED" },
  { min: 50, icon: "badge-platinum", label: "Platinum", color: "#64748B" },
];

/** Pick current-achieved and next-locked tiers from a count.
 *  Returns null tier slots for users below the first threshold or
 *  past the last threshold (caller handles those cases). */
function tiersForCount(count: number): { left: TierDef | null; right: TierDef | null } {
  let left: TierDef | null = null;
  let right: TierDef | null = null;
  for (let i = 0; i < PROGRESS_TIERS.length; i++) {
    if (count < PROGRESS_TIERS[i].min) {
      right = PROGRESS_TIERS[i];
      left  = i > 0 ? PROGRESS_TIERS[i - 1] : null;
      return { left, right };
    }
  }
  return { left: PROGRESS_TIERS[PROGRESS_TIERS.length - 1], right: null };
}

function ProgressBar({
  avatar, name, suggestionCount,
}: { avatar?: string | null; name?: string; suggestionCount: number }) {
  const { left, right } = tiersForCount(suggestionCount);
  if (!right) return null;

  // Track geometry (in % of bar width — keeps it responsive).
  // The track inset starts after the left badge column and ends
  // before the right badge column. Avatar position interpolates
  // along that inner segment.
  const leftMin  = left?.min ?? 0;
  const rightMin = right.min;
  const range    = Math.max(1, rightMin - leftMin);
  const filled   = Math.max(0, Math.min(suggestionCount - leftMin, range));
  // Avatar always sits at least 5% in (so it doesn't sit ON the
  // left badge when count == leftMin) and at most 95% (so it doesn't
  // overlap the right badge before unlock).
  const pct = Math.max(0.05, Math.min(0.95, filled / range));

  // Number of "remaining" dashed dots between avatar and right badge.
  // 8 looks balanced for any progress level — they're decorative, not
  // a literal count of remaining suggestions.
  const REMAINING_DOTS = 8;
  const visibleDots = Math.max(2, Math.round((1 - pct) * REMAINING_DOTS));

  return (
    <div className="relative w-full max-w-[342px] mx-auto">
      {/* Track — inset between the two badges (badges are 60px wide,
          plus a bit of breathing room). */}
      <div className="relative h-[72px] flex items-center">
        {/* Left badge column */}
        <div className="relative flex flex-col items-center w-[60px] shrink-0 z-10">
          <div className="relative flex items-center justify-center w-12 h-12">
            <TwinkleField color={left?.color ?? "#10B981"} />
            {left ? (
              <Icon name={left.icon} size={48} />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-zinc-200 border-2 border-zinc-300" />
            )}
          </div>
        </div>

        {/* Track inner — solid fill (left side) + dotted (right side) */}
        <div className="relative flex-1 h-3 mx-[-6px]" aria-hidden>
          {/* Background track (zinc-200, subtle) */}
          <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-zinc-100" />
          {/* Solid fill from left badge → avatar position. Colored
              with the current tier's accent. */}
          <div
            className="absolute top-0 left-0 h-3 rounded-full transition-[width] duration-500"
            style={{
              width: `${pct * 100}%`,
              backgroundColor: left?.color ?? "#10B981",
              boxShadow: "0 1px 5px 0 rgba(0, 48, 84, 0.18)",
            }}
          />
          {/* Dashed dots from avatar position → right badge. */}
          <div
            className="absolute top-1/2 -translate-y-1/2 flex items-center justify-evenly"
            style={{ left: `${pct * 100}%`, right: 0 }}
          >
            {Array.from({ length: visibleDots }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
            ))}
          </div>
        </div>

        {/* Right badge column */}
        <div className="relative flex flex-col items-center w-[60px] shrink-0 z-10">
          <div className="relative flex items-center justify-center w-12 h-12">
            <TwinkleField color="#CBD5E1" subtle />
            <div className="opacity-55 grayscale">
              <Icon name={right.icon} size={48} />
            </div>
          </div>
        </div>

        {/* Avatar — absolute over the whole row, positioned along the
            inner track between the two badge columns. Calc takes the
            left badge column width (60px) as offset and `pct` of the
            inner track (total width minus both columns) for the
            travel distance. */}
        <div
          className="absolute top-1/2 -translate-y-1/2 z-20 transition-[left] duration-500"
          style={{
            left: `calc(60px + ${pct} * (100% - 120px))`,
          }}
        >
          <div
            className="-translate-x-1/2 animate-bob rounded-full overflow-hidden bg-white"
            style={{
              width:  44,
              height: 44,
              border: "3px solid #FFFFFF",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.18)",
            }}
          >
            <AvatarImage url={avatar} name={name} size={38} className="rounded-full" />
          </div>
        </div>
      </div>

      {/* Tier labels — sit under the badges, aligned to their columns */}
      <div className="mt-3 flex items-start justify-between text-center">
        <p className="w-[60px] text-[13px] font-semibold text-zinc-800 leading-tight">
          {left?.label ?? "Νέος"}
        </p>
        <p className="w-[60px] text-[13px] font-medium text-zinc-400 leading-tight">
          {right.label}
        </p>
      </div>
    </div>
  );
}

/**
 * 4 sparkles arranged around a badge, slow stagger. `subtle` desaturates
 * for locked badges. Uses the global `animate-twinkle` keyframe + per-
 * sparkle delays so the cluster shimmers rather than pulses in unison.
 */
function TwinkleField({ color, subtle = false }: { color: string; subtle?: boolean }) {
  const SPARKLES = [
    { x: -16, y: -14, size: 10, delay: 0 },
    { x:  14, y: -10, size: 12, delay: 600 },
    { x: -14, y:  16, size:  9, delay: 1200 },
    { x:  18, y:  14, size: 11, delay: 1800 },
  ];
  return (
    <span className="absolute inset-0 pointer-events-none" aria-hidden>
      {SPARKLES.map((s, i) => (
        <span
          key={i}
          className="absolute animate-twinkle"
          style={{
            left: `calc(50% + ${s.x}px)`,
            top:  `calc(50% + ${s.y}px)`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${s.delay}ms`,
            color,
            opacity: subtle ? 0.5 : 1,
          }}
        >
          <svg width={s.size} height={s.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0 L13.5 9 L24 12 L13.5 15 L12 24 L10.5 15 L0 12 L10.5 9 Z" />
          </svg>
        </span>
      ))}
    </span>
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
  const [popupTab, setPopupTab] = useState<"followers" | "following" | null>(null);
  async function handleLogout() {
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const name = displayName ?? handle ?? "—";

  // Next level milestone — extended to all 4 tiers (Verified 3, Έμπειρος
  // 10, Expert 25, Platinum 50). The ProgressBar component does its own
  // tier resolution; this top-line headline mirrors it for the copy.
  const nextMilestone =
    suggestionCount < 3  ? 3  :
    suggestionCount < 10 ? 10 :
    suggestionCount < 25 ? 25 :
    suggestionCount < 50 ? 50 : null;
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
      {/* Tier is derived from suggestion_count (canonical source per
          session 20 fix). Below 3 suggestions the user has no badge
          yet — we hide the whole block so the profile doesn't show a
          misleading "Verified" to fresh accounts. For Platinum users
          we also add a motivational line below the badge — there's
          no next tier to chase, so the only place to congratulate
          them is here. */}
      {(() => {
        const heroBadgeIcon  = badgeIconForSuggestions(suggestionCount);
        const heroBadgeLabel = badgeLabelForSuggestions(suggestionCount);
        if (!heroBadgeIcon || !heroBadgeLabel) return null;
        const isPlatinum = suggestionCount >= 50;
        return (
          <div className="flex flex-col items-center px-5 mt-2 gap-4">
            <div className="flex items-center justify-center">
              <Icon name="profile-leaves-left" width={140} height={148} alt="" className="shrink-0" />
              <div className="flex flex-col items-center gap-4 shrink-0 z-10 -mx-7">
                <span className="inline-block animate-badge-pulse will-change-transform origin-center">
                  <Icon name={heroBadgeIcon} size={104} alt="" />
                </span>
                <p className="text-[18px] font-bold text-zinc-700 text-center leading-[130%] whitespace-pre-line">
                  {`${heroBadgeLabel}\nMember`}
                </p>
              </div>
              <Icon name="profile-leaves-right" width={140} height={148} alt="" className="shrink-0" />
            </div>
            {isPlatinum && (
              <p className="text-[15px] text-zinc-600 leading-[150%] text-center max-w-[320px] px-2">
                Έχεις κάνει <strong className="text-zinc-900">{suggestionCount}</strong> προτάσεις. Είσαι από τους κορυφαίους curators της κοινότητας.
              </p>
            )}
          </div>
        );
      })()}

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

      {/* ── 6. Level progress ───────────────────────────────────
          Headline + bar for users still climbing. Platinum users skip
          this entirely (celebration sits in the hero above). The old
          "Νέα πρόταση" CTA + motivational copy removed — the global
          FAB already covers the suggest action and the headline above
          the bar is motivation enough. */}
      {nextMilestone && (
        <div className="flex flex-col items-center gap-8" style={{ padding: "40px 24px" }}>
          <p className="text-[26px] text-zinc-800 leading-[130%] text-center">
            <span className="font-normal">Σε </span>
            <span className="font-extrabold">{toNextLevel} {toNextLevel === 1 ? "πρόταση" : "προτάσεις"} </span>
            <span className="font-bold">ανεβαίνεις</span>
            <br />
            <span className="font-bold">στο επόμενο επίπεδο!</span>
          </p>
          <ProgressBar avatar={avatarUrl} name={name} suggestionCount={suggestionCount} />
        </div>
      )}

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
