"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface HeaderProps {
  isRegistered?: boolean;
  notificationCount?: number;
  className?: string;
}

export function Header({
  isRegistered = false,
  notificationCount = 0,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-white",
        "h-16 px-5 flex items-center justify-between",
        "shadow-[0px_6px_20px_-10px_rgba(0,0,0,0.15)]",
        className,
      )}
    >
      {/* Logo */}
      <Link href="/" className="flex items-baseline gap-[2px] select-none">
        <span className="text-2xl font-black text-zinc-800 tracking-tight leading-none">
          Proteino
        </span>
        {/* Subtle 4s opacity pulse on the coral dot — a tiny "alive"
         *  signal in an otherwise static logo. Pauses on hover so the
         *  user can read it cleanly when interacting. */}
        <span className="w-[5px] h-[5px] rounded-full bg-coral-600 mb-[3px] animate-pulse [animation-duration:4s] hover:[animation-play-state:paused]" />
      </Link>

      {/* Right slot: notifications (registered) or sign-in (guest) */}
      {isRegistered ? (
        <Link
          href="/notifications"
          aria-label="Ειδοποιήσεις"
          className={cn(
            "relative w-9 h-9 flex items-center justify-center",
            "rounded-full bg-zinc-100",
            "transition-colors active:bg-zinc-200",
          )}
        >
          <Bell size={18} strokeWidth={2} className="text-zinc-700" />
          {notificationCount > 0 && (
            <span
              aria-label={`${notificationCount} αδιάβαστες ειδοποιήσεις`}
              className={cn(
                "absolute -top-0.5 -right-0.5",
                "min-w-[16px] h-4 px-[3px]",
                "flex items-center justify-center",
                "rounded-full bg-badge-red border-2 border-white",
                "text-[9px] font-bold text-white leading-none",
              )}
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </Link>
      ) : (
        <Link
          href="/login"
          className={cn(
            "h-11 px-4 flex items-center justify-center",
            "border-[1.5px] border-zinc-700 rounded-sm",
            "text-base font-semibold text-zinc-800",
            "transition-colors active:bg-zinc-50",
          )}
        >
          Σύνδεση
        </Link>
      )}
    </header>
  );
}

/* ── Inner-page header (category, detail, settings pages) ─── */
interface InnerHeaderProps {
  title:       string;
  onBack?:     () => void;
  rightSlot?:  React.ReactNode;
  className?:  string;
}

export function InnerHeader({ title, onBack, rightSlot, className }: InnerHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-white",
        "h-14 px-4 flex items-center gap-3",
        "border-b border-zinc-200",
        className,
      )}
    >
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Πίσω"
          className="w-9 h-9 flex items-center justify-center rounded-full bg-zinc-100 active:bg-zinc-200 transition-colors shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      <span className="flex-1 text-base font-bold text-zinc-800 truncate">{title}</span>
      {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
    </header>
  );
}

/* ── Overlay header (search + suggestion flows) ─────────────── */
interface OverlayHeaderProps {
  label:      string;
  icon:       React.ReactNode;
  onClose:    () => void;
  className?: string;
}

export function OverlayHeader({ label, icon, onClose, className }: OverlayHeaderProps) {
  // Slim mobile-friendly variant — dropped the bottom border + the
  // zinc-100 background circle around the X to claw back vertical
  // pixels above the iOS keyboard. Header height down from 56px to
  // 44px (~22% saved). The X button is now a naked icon with a
  // hit-target via padding (still 36px tap area for accessibility)
  // but no visible chrome.
  return (
    <div
      className={cn(
        "flex items-center justify-between",
        "h-11 px-5",
        "bg-white",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-coral-600">{icon}</span>
        <span className="text-sm font-bold text-zinc-800 tracking-widest uppercase">
          {label}
        </span>
      </div>
      <button
        onClick={onClose}
        aria-label="Κλείσιμο"
        className="-mr-2 p-2 flex items-center justify-center text-zinc-600 active:text-zinc-900 transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
