"use client";

import Link from "next/link";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { FollowButton } from "@/components/ui/FollowButton";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";

export interface TopUser {
  id: string;
  name: string;
  handle: string;
  rank: number;
  total_users: number;
  suggestion_count: number;
  avg_rating: number;
  badge: string;
  placeholder_color?: string;
}

export interface ContributorUser {
  id: string;
  name: string;
  handle: string;
  suggestion_count: number;
  placeholder_color?: string;
}

interface Props {
  categoryLabel: string;
  topUser: TopUser;
  contributors: ContributorUser[];
}

export function CategoryTopUsers({ categoryLabel, topUser, contributors }: Props) {
  return (
    <section className="space-y-6 px-6">
      {/* Section header */}
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-bold text-zinc-700 uppercase tracking-[0.1px] shrink-0">
          Top Χρήστες σε {categoryLabel}
        </h2>
        <div className="h-px flex-1 bg-zinc-300" />
      </div>

      {/* #1 featured user */}
      <div className="flex flex-col items-center gap-10 py-6 border border-zinc-200 rounded-sm">
        {/* Avatar + badge */}
        <div className="flex flex-col items-center gap-3">
          <div style={{ outline: "5px solid #F2F2F7", borderRadius: "50%" }}>
            <UserAvatarWithPopup
              user={{ id: topUser.id, display_name: topUser.name, handle: topUser.handle, suggestion_count: topUser.suggestion_count, avg_quality_score: topUser.avg_rating }}
              size={90}
            />
          </div>
          <div className="flex items-center gap-1">
            <BadgeIcon />
            <span className="text-xs font-medium text-zinc-800 uppercase tracking-wide">
              {topUser.badge}
            </span>
          </div>
          <p className="text-[18px] font-bold text-zinc-800 text-center">{topUser.name}</p>
        </div>

        {/* Stats row */}
        <div className="flex items-start justify-center gap-11">
          <Stat
            icon={<TrophyIcon />}
            value={`${topUser.rank}η`}
            label={`ΣΕ ${topUser.total_users} ΧΡΗΣΤΕΣ`}
          />
          <Stat
            value={topUser.suggestion_count.toString()}
            label={`ΠΡΟΤΑΣΕΙΣ ΣΕ ${categoryLabel.toUpperCase()}`}
          />
          <Stat
            value={topUser.avg_rating.toFixed(2)}
            label="ΒΑΘΜΟΛΟΓΙΑ"
            icon={<StarIcon />}
          />
        </div>

        {/* Follow button */}
        <FollowButton variant="dark" size="lg" />
      </div>

      {/* Contributor grid */}
      <div className="grid grid-cols-2 gap-5">
        {contributors.map((user) => (
          <div
            key={user.id}
            className="border border-zinc-200 rounded-lg py-4 px-3 flex flex-col items-center gap-6"
            style={{ width: 161 }}
          >
            <div className="flex flex-col items-center gap-5">
              <UserAvatarWithPopup
                user={{ id: user.id, display_name: user.name, handle: user.handle, suggestion_count: user.suggestion_count }}
                size={75}
              />
              <div className="flex flex-col items-center gap-3">
                <Link href={`/profile/${user.handle}`} className="active:opacity-75">
                  <p className="text-lg font-bold text-zinc-800 leading-[22px] text-center line-clamp-2" style={{ width: 131 }}>
                    {user.name}
                  </p>
                </Link>
                <p className="text-base text-center leading-[22px]" style={{ letterSpacing: "-0.5px" }}>
                  <span className="font-bold text-zinc-700">{user.suggestion_count}</span>
                  <span className="text-zinc-700"> προτάσεις</span>
                </p>
              </div>
            </div>
            <FollowButton size="md" className="w-[127px]" />
          </div>
        ))}
      </div>

      {/* Leaderboard CTA */}
      <Link
        href="/leaderboard"
        className="flex items-center justify-center w-full py-[18px] border-[1.5px] border-zinc-600 rounded-full text-base font-semibold text-zinc-700 active:bg-zinc-50 transition-colors"
      >
        Δες όλο το Leaderboard
      </Link>
    </section>
  );
}

function Stat({ icon, value, label }: { icon?: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {icon && <div className="mb-1">{icon}</div>}
      <p className="text-[18px] font-bold text-zinc-800 leading-[18.52px]">{value}</p>
      <p className="text-xs font-medium text-zinc-600 leading-tight max-w-[80px]">{label}</p>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 60 60" fill="none" aria-hidden>
      <path d="M15 8h30v22a15 15 0 01-30 0V8z" fill="#F8D160" stroke="#c9a800" strokeWidth="2" />
      <path d="M15 14H8a7 7 0 007 7" stroke="#c9a800" strokeWidth="2" strokeLinecap="round" />
      <path d="M45 14h7a7 7 0 01-7 7" stroke="#c9a800" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 38v8M22 52h16" stroke="#c9a800" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="13" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill="#27272A" />
    </svg>
  );
}

function BadgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 1l1.8 3.6L14 5.2l-3 2.9.7 4.1L8 10.1l-3.7 2.1.7-4.1-3-2.9 4.2-.6L8 1z" fill="#FE6F5E" />
    </svg>
  );
}
