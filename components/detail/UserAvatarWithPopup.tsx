"use client";

import { useState } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { ProfilePopup } from "@/components/profile/ProfilePopup";
import { badgeLabelForSuggestions } from "@/lib/icons";

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
      <button
        onClick={(e) => {
          // Avatar may be rendered inside a parent <Link> (e.g. inside a
          // CarouselLandscape card). Stop bubbling so the surrounding
          // navigation doesn't fire alongside the popup open.
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className="active:opacity-75 shrink-0"
      >
        <AvatarImage
          url={user.avatar_url}
          name={displayName}
          size={size}
          className={className ?? "rounded-full"}
        />
      </button>

      {/* ProfilePopup is ALWAYS rendered (returns null internally when
       *  not mounted). Conditional mount via `{open && ...}` would
       *  unmount the popup instantly on close, killing the exit
       *  animation before it could play. ProfilePopup carries its own
       *  mounted/closing state so the slide-out completes. */}
      <ProfilePopup
        user={{
          id: user.id ?? "",
          handle: user.handle ?? "user",
          display_name: displayName,
          avatar_url: user.avatar_url,
          suggestion_count: user.suggestion_count ?? 0,
          avg_rating: user.avg_quality_score ?? 0,
          // Derive from suggestion_count when available — `level` is
          // stuck at 1 across the migrated user corpus, so the legacy
          // level-based mapping painted everyone "Verified".
          badge: badgeLabelForSuggestions(user.suggestion_count ?? 0),
        }}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
