"use client";

import { useEffect, useRef } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { FollowButton } from "@/components/ui/FollowButton";

interface ProfilePopupUser {
  id:               string;
  handle:           string;
  display_name:     string;
  avatar_url?:      string | null;
  suggestion_count: number;
  avg_rating:       number;
  badge?:           string | null;
  category_count?:  number;
  category_label?:  string;
}

interface ProfilePopupProps {
  user:    ProfilePopupUser;
  open:    boolean;
  onClose: () => void;
}

export function ProfilePopup({ user, open, onClose }: ProfilePopupProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        ref={ref}
        className="w-full max-w-[390px] bg-white animate-in slide-in-from-bottom duration-300"
        style={{ borderRadius: "22px 22px 0 0" }}
      >
        {/* Header with close */}
        <div className="flex items-center justify-end px-0 h-12">
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center"
            aria-label="Κλείσιμο"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-12 px-6 pb-12">
          {/* User info */}
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col items-center gap-4">
              <AvatarImage
                url={user.avatar_url}
                name={user.display_name}
                size={85}
                className="rounded-full"
              />
              <div className="flex flex-col items-center gap-3">
                <p className="text-lg font-bold text-zinc-700 text-center leading-[120%]">
                  {user.display_name}
                </p>
                {user.badge && (
                  <div className="flex items-center gap-3">
                    <span className="text-base font-medium text-zinc-700">{user.badge}</span>
                    <BadgeSmallIcon type={user.badge} />
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-5">
              <StatItem value={user.suggestion_count.toString()} label="ΠΡΟΤΑΣΕΙΣ" />
              <div className="h-px bg-[#F2F2F7] w-28" />
              <StatItem value={user.avg_rating.toFixed(1)} label="ΒΑΘΜΟΛΟΓΙΑ" />
              {user.category_count !== undefined && user.category_label && (
                <>
                  <div className="h-px bg-[#F2F2F7] w-28" />
                  <StatItem
                    value={user.category_count.toString()}
                    label={`ΠΡΟΤΑΣΕΙΣ\nΣΕ ${user.category_label}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Follow button */}
          <FollowButton variant="dark" size="lg" />
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-2xl font-extrabold text-zinc-800 leading-[18.52px]">{value}</p>
      <p className="text-base font-semibold text-zinc-500 leading-[18.52px] whitespace-pre-line">{label}</p>
    </div>
  );
}

function BadgeSmallIcon({ type }: { type: string }) {
  const lower = type.toLowerCase();
  let gradient = "linear-gradient(32deg, rgba(0,181,139,1) 9%, rgba(92,237,203,0.3) 100%)";
  if (lower === "expert") gradient = "linear-gradient(32deg, rgba(1,113,199,1) 9%, rgba(152,210,254,0.3) 100%)";
  if (lower === "gold") gradient = "linear-gradient(32deg, rgba(255,191,120,1) 9%, rgba(255,238,169,0.3) 100%)";
  if (lower === "platinum") gradient = "linear-gradient(32deg, rgba(168,134,181,1) 9%, rgba(240,200,255,0.3) 100%)";

  return (
    <div className="w-8 h-8 rounded-full" style={{ background: gradient }} />
  );
}
