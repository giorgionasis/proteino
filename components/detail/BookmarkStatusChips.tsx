"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";
import { statusChipLabel } from "@/lib/bookmarks/labels";
import type { BookmarkStatus } from "@/hooks/useBookmark";

/**
 * Two mutually-exclusive status chips. Renders ALWAYS — both when
 * the item is bookmarked (current status filled) and when it isn't
 * (outline buttons that materialise the bookmark on tap). The chips
 * double as a discoverable affordance + a state setter.
 *
 * Tapping either chip when not bookmarked creates the row with that
 * status. Tapping the inactive chip when bookmarked moves the status.
 * Tapping the already-active chip is a no-op (left as a safety
 * default; we don't want one tap to delete the bookmark).
 *
 * The detail page calls `useBookmark()` once and passes the
 * controller down to both this component and `<DetailHeaderActions>`.
 */

export interface BookmarkController {
  status:     BookmarkStatus | null;
  bookmarked: boolean;
  busy:       boolean;
  toggle:     () => Promise<{ ok: boolean; status: BookmarkStatus | null; context: any | null; moment: any | null }>;
  setStatus:  (next: BookmarkStatus) => Promise<{ ok: boolean; status: BookmarkStatus; context: any | null }>;
}

interface Props {
  category:    string;
  bookmark:    BookmarkController;
  /** Toast caller injected from the host page so we share one toast surface. */
  onToast?:    (message: string) => void;
  className?:  string;
}

export function BookmarkStatusChips({ category, bookmark, onToast, className }: Props) {
  const { status, bookmarked, busy, setStatus } = bookmark;
  const { requireAuth, modalProps } = useGuestGuard("να σώσεις στις λίστες σου");

  // Pop the active chip every time the status flips to a new value.
  const [popKey, setPopKey] = useState(0);
  const lastStatus = useRef<BookmarkStatus | null>(status);
  useEffect(() => {
    if (lastStatus.current !== status && status !== null) {
      setPopKey((k) => k + 1);
    }
    lastStatus.current = status;
  }, [status]);

  async function handleSelect(next: BookmarkStatus) {
    requireAuth(async () => {
      const prevStatus = status;
      if (prevStatus === next) return; // already in this state — no-op
      const result = await setStatus(next);
      if (!result.ok) {
        onToast?.("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      }
    });
  }

  const wishlistActive = status === "wishlist";
  const doneActive     = status === "done";

  const headlineCopy = bookmarked
    ? "Στις λίστες σου"
    : "Πρόσθεσέ το στις λίστες σου";

  return (
    <div className={cn("space-y-3", className)}>
      <p className={cn(
        "text-[12px] font-medium text-center transition-colors",
        bookmarked ? "text-zinc-500" : "text-zinc-700",
      )}>
        🔖 {headlineCopy}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Chip
          active={wishlistActive}
          label={statusChipLabel(category, "wishlist")}
          onClick={() => handleSelect("wishlist")}
          disabled={busy}
          popKey={wishlistActive ? popKey : undefined}
          icon={wishlistActive ? "heart" : undefined}
        />
        <Chip
          active={doneActive}
          label={statusChipLabel(category, "done")}
          onClick={() => handleSelect("done")}
          disabled={busy}
          popKey={doneActive ? popKey : undefined}
          icon={doneActive ? "check" : undefined}
        />
      </div>
      <GuestPromptModal {...modalProps} />
    </div>
  );
}

interface ChipProps {
  active:    boolean;
  label:     string;
  onClick:   () => void;
  disabled?: boolean;
  popKey?:   number;
  icon?:     "check" | "heart";
}

function Chip({ active, label, onClick, disabled, popKey, icon }: ChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-12 rounded-[12px] inline-flex items-center justify-center gap-2",
        "text-[14px] font-semibold transition-all duration-200 ease-soft",
        "active:scale-[0.97] select-none disabled:opacity-60",
        active
          ? "bg-[#FE6F5E] text-white shadow-sm"
          : "bg-white text-zinc-700 border border-coral-200 hover:border-coral-600/60",
      )}
    >
      {icon && (
        <span
          key={`icon-${popKey}`}
          className={popKey !== undefined ? "animate-pop-in inline-flex" : "inline-flex"}
          aria-hidden
        >
          {icon === "check" ? <CheckIcon /> : <HeartIcon />}
        </span>
      )}
      <span key={`label-${popKey}`} className={popKey !== undefined ? "animate-pop-in" : undefined}>
        {label}
      </span>
    </button>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21s-7-4.35-9.5-9C0.5 7.5 3 4 6.5 4c2 0 3.5 1 5.5 3 2-2 3.5-3 5.5-3 3.5 0 6 3.5 4 8-2.5 4.65-9.5 9-9.5 9z" />
    </svg>
  );
}
