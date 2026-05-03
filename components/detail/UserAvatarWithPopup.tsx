"use client";

import { useState } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { ProfilePopup } from "@/components/profile/ProfilePopup";

interface UserData {
  id?: string;
  handle?: string;
  display_name?: string;
  name?: string;
  avatar_url?: string | null;
  level?: number;
  suggestion_count?: number;
  avg_quality_score?: number | null;
}

function getBadgeLabel(level: number): string {
  if (level >= 10) return "Expert";
  if (level >= 5) return "Gold";
  return "Verified";
}

interface Props {
  user: UserData;
  size?: number;
  className?: string;
}

export function UserAvatarWithPopup({ user, size = 50, className }: Props) {
  const [open, setOpen] = useState(false);
  const displayName = user.display_name ?? user.name ?? "Χρήστης";

  return (
    <>
      <button onClick={() => setOpen(true)} className="active:opacity-75 shrink-0">
        <AvatarImage
          url={user.avatar_url}
          name={displayName}
          size={size}
          className={className ?? "rounded-full"}
        />
      </button>

      {open && (
        <ProfilePopup
          user={{
            id: user.id ?? "",
            handle: user.handle ?? "user",
            display_name: displayName,
            avatar_url: user.avatar_url,
            suggestion_count: user.suggestion_count ?? 0,
            avg_rating: user.avg_quality_score ?? 0,
            badge: getBadgeLabel(user.level ?? 1),
          }}
          open
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
