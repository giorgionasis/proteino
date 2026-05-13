"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { FollowButton } from "@/components/ui/FollowButton";
import { Icon } from "@/components/ui/Icon";
import { useAuthStore } from "@/stores/authStore";
import { useFollow } from "@/hooks/useFollow";
import type { IconName } from "@/lib/icons";

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

/**
 * User profile popup — bottom-sheet style modal.
 *
 * Mount lifecycle (3 phases for clean enter + exit):
 *   1. `mounted=false`            → not in DOM, returns null.
 *   2. open → mounted=true        → DOM mounted at translateY(100%)
 *                                   (off-screen below).
 *   3. requestAnimationFrame      → visible=true → CSS transition
 *                                   slides the sheet up to translateY(0).
 *   4. close → visible=false      → slide back down to translateY(100%).
 *   5. setTimeout(320)            → mounted=false → unmount.
 *
 * Why portal:
 *   The popup is often rendered inside a parent <Link> (carousel cards).
 *   React event bubbling traverses the React tree regardless of CSS
 *   positioning — without a portal, clicking ANYWHERE in the popup would
 *   bubble to the Link and trigger navigation. Rendering through a body-
 *   level portal cuts the React parent chain at the popup's root, so
 *   bubbled events stay inside the popup.
 */
export function ProfilePopup({ user, open, onClose }: ProfilePopupProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const viewerId = useAuthStore((s) => s.supabaseUser?.id ?? null);
  const isSelf = !!viewerId && !!user.id && viewerId === user.id;

  // Real follow persistence. Initial state defaults to `false` and is
  // corrected by the GET below once the popup opens (a popup-only fetch
  // avoids pre-fetching follow state for every avatar in a long carousel
  // — most never get tapped). useFollow's setFollowing isn't externally
  // exposed, so we re-mount via key when the seed changes.
  const [initialFollowing, setInitialFollowing] = useState(false);
  const [followKey, setFollowKey] = useState(0);

  useEffect(() => {
    if (!open || !user.id || isSelf || !viewerId) return;
    let cancelled = false;
    fetch(`/api/follows?user_id=${encodeURIComponent(user.id)}`)
      .then((r) => (r.ok ? r.json() : { following: false }))
      .then((data: { following?: boolean }) => {
        if (cancelled) return;
        if (data.following) {
          setInitialFollowing(true);
          setFollowKey((k) => k + 1);
        }
      })
      .catch(() => { /* keep default false */ });
    return () => { cancelled = true; };
  }, [open, user.id, isSelf, viewerId]);

  // Phase 1: react to `open` prop changes.
  useEffect(() => {
    if (open) {
      setMounted(true);
    } else if (mounted) {
      setVisible(false);
      const t = window.setTimeout(() => setMounted(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  // Phase 2: once mounted, schedule the open transition on the next
  // frame so the browser has rendered the closed state first.
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  // Lock body scroll while the popup is open.
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [mounted]);

  if (!mounted) return null;
  // SSR safeguard: createPortal needs `document` which doesn't exist
  // during server render. We're in a "use client" file but app router
  // can still tree-shake it server-side at first paint — hence guard.
  if (typeof document === "undefined") return null;

  // Backdrop click handler — close ONLY when the click target is the
  // backdrop itself, not bubbled from inner content.
  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Close handler for explicit close buttons (X). Always closes.
  const onCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  // Sheet click — stop bubbling so backdrop's onClick (which checks
  // target === currentTarget anyway) is fully isolated.
  const onSheetClick = (e: React.MouseEvent) => e.stopPropagation();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 transition-opacity duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      onClick={onBackdropClick}
    >
      <div
        className="w-full max-w-[420px] bg-white will-change-transform"
        style={{
          borderRadius: "22px 22px 0 0",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 320ms cubic-bezier(0.32, 0.72, 0, 1)",
        }}
        onClick={onSheetClick}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-end px-0 h-12">
          <button
            type="button"
            onClick={onCloseClick}
            className="w-12 h-12 flex items-center justify-center active:opacity-70 transition-opacity"
            aria-label="Κλείσιμο"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center gap-10 px-6 pb-10">
          <div className="flex items-start justify-between w-full gap-6">
            <div className="flex flex-col items-center gap-4 shrink-0">
              <AvatarImage
                url={user.avatar_url}
                name={user.display_name}
                size={120}
                className="rounded-full"
              />
              <div className="flex flex-col items-center gap-2">
                <p className="text-[17px] font-bold text-zinc-800 text-center leading-tight">
                  {user.display_name}
                </p>
                {user.badge && (
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-zinc-700">{user.badge}</span>
                    <BadgeIcon kind={user.badge} />
                  </div>
                )}
              </div>
            </div>

            {/* Stats column */}
            <div className="flex flex-col gap-4 pt-1">
              <StatItem value={user.suggestion_count.toString()} label="ΠΡΟΤΑΣΕΙΣ" />
              <div className="h-px bg-zinc-100 w-28" />
              <StatItem value={user.avg_rating.toFixed(1)} label="ΒΑΘΜΟΛΟΓΙΑ" />
              {user.category_count !== undefined && user.category_label && (
                <>
                  <div className="h-px bg-zinc-100 w-28" />
                  <StatItem
                    value={user.category_count.toString()}
                    label={`ΠΡΟΤΑΣΕΙΣ\nΣΕ ${user.category_label}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Follow button — or self-link when viewer is the popup user */}
          <div className="w-full flex justify-center">
            {isSelf ? (
              <Link
                href={`/profile/${user.handle}`}
                onClick={onClose}
                className="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
              >
                Δες το προφίλ σου →
              </Link>
            ) : (
              <PopupFollowButton
                key={followKey}
                targetUserId={user.id}
                initialFollowing={initialFollowing}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function PopupFollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: string;
  initialFollowing: boolean;
}) {
  const { following, toggle } = useFollow(targetUserId, initialFollowing);
  return <FollowButton variant="dark" size="lg" following={following} onToggle={toggle} />;
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[26px] font-extrabold text-zinc-800 leading-none">{value}</p>
      <p className="text-[13px] font-semibold text-zinc-500 leading-tight tracking-wide whitespace-pre-line">{label}</p>
    </div>
  );
}

/** Renders the canonical badge SVG (verified / gold / expert / platinum)
 *  from /public/icons/badges/, registered in lib/icons.ts. */
function BadgeIcon({ kind }: { kind: string }) {
  const lower = kind.toLowerCase();
  const name: IconName | null =
    lower === "expert"     ? "badge-expert"
    : lower === "gold"     ? "badge-gold"
    : lower === "platinum" ? "badge-platinum"
    : lower === "verified" ? "badge-verified"
    : null;
  if (!name) return null;
  return <Icon name={name} size={28} />;
}
