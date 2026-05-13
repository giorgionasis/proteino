"use client";

import Link from "next/link";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { FollowButton } from "@/components/ui/FollowButton";
import { UserAvatarWithPopup } from "@/components/detail/UserAvatarWithPopup";
import { useFollow } from "@/hooks/useFollow";

export interface SuggestedUser {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string | null;
  suggestion_count?: number;
  placeholder_color?: string;
  /** Server-fetched initial follow state for the viewer → this user. */
  is_following?: boolean;
}

interface SuggestedUsersProps {
  users: SuggestedUser[];
}

export function SuggestedUsers({ users }: SuggestedUsersProps) {
  return (
    <section className="space-y-5">
      {/* Section header */}
      <div className="px-6 flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-700 uppercase tracking-[0.1px]">
          Χρήστες με Παρόμοιες Προτιμήσεις
        </h2>
      </div>

      {/* 2-column grid */}
      <div className="grid grid-cols-2 gap-5 px-6">
        {users.map((user) => (
          <SuggestedUserCard key={user.id} user={user} />
        ))}
      </div>
    </section>
  );
}

function SuggestedUserCard({ user }: { user: SuggestedUser }) {
  // Real follow persistence via useFollow. Initial state from server so
  // the button doesn't flicker.
  const { following, toggle } = useFollow(user.id, user.is_following ?? false);

  return (
    <div
      className="border border-zinc-200 rounded-lg py-4 px-3 flex flex-col items-center gap-6"
      style={{ width: 161 }}
    >
      {/* Avatar + name + count */}
      <div className="flex flex-col items-center gap-5">
        <UserAvatarWithPopup
          user={{ id: user.id, display_name: user.name, handle: user.handle, avatar_url: user.avatar_url, suggestion_count: user.suggestion_count }}
          size={75}
        />

        <div className="flex flex-col items-center gap-3">
          <Link href={`/profile/${user.handle}`} className="active:opacity-75">
            <p className="text-lg font-bold text-zinc-800 leading-[22px] text-center line-clamp-2" style={{ width: 131 }}>
              {user.name}
            </p>
          </Link>

          {user.suggestion_count !== undefined && (
            <p className="text-base text-center leading-[22px]" style={{ letterSpacing: "-0.5px" }}>
              <span className="font-bold text-zinc-700">{user.suggestion_count}</span>
              <span className="text-[#1F1F1F]"> </span>
              <span className="text-zinc-700">προτάσεις</span>
            </p>
          )}
        </div>
      </div>

      {/* Follow button — controlled by useFollow so the click actually persists */}
      <FollowButton
        size="md"
        className="w-[127px]"
        following={following}
        onToggle={toggle}
      />
    </div>
  );
}
