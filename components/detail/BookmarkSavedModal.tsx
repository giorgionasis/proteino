"use client";

import { useEffect, useState, Fragment } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { bookmarkLabels } from "@/lib/bookmarks/labels";
import type { BookmarkStatus, BookmarkContext } from "@/hooks/useBookmark";
import type { ResolvedMoment } from "@/lib/moments";

/**
 * Celebration modal shown right after a fresh bookmark save. The
 * value-add over a single-line toast is social proof: an avatar
 * stack of other people who've added this item to their lists +
 * an explicit count of how many more there are.
 *
 * Design from the user's Figma mock:
 *   • White card, large rounded corners, centred on viewport
 *   • Big bold headline — category-specific ("στις ταινίες σου")
 *   • Up-to-9 circular avatars + "+N" overflow chip
 *   • Subtitle: "X ακόμη χρήστες την έχουν προσθέσει στο προφίλ τους"
 *   • X close in top-right
 *
 * The modal is portal-mounted to <body> to escape any transformed
 * ancestors (CLAUDE.md §31 — "Transformed ancestor → position:fixed
 * containing block"). Slide-up + fade-in entrance via the 3-phase
 * mount pattern used by ProfilePopup.
 */

export interface BookmarkSaveResult {
  status:  BookmarkStatus;
  context: BookmarkContext | null;
  /** Optional moment resolved from the DB. When present, its copy
   *  overrides the inline headline + body. When null (no row matched
   *  OR migration 026/027 not yet applied), the modal renders inline
   *  fallback copy so behaviour matches the pre-moments era. */
  moment?: ResolvedMoment | null;
}

interface Props {
  open:     boolean;
  result:   BookmarkSaveResult | null;
  category: string;
  onClose:  () => void;
}

const VISIBLE_AVATARS = 9;

export function BookmarkSavedModal({ open, result, category, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 240);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-dismiss after 5s — long enough to read the message, short
  // enough not to feel sticky if the user moves on.
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(t);
  }, [visible, onClose]);

  // Body-scroll lock while open — same pattern as Modal primitive.
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  if (!mounted || !result) return null;
  if (typeof document === "undefined") return null;

  const labels = bookmarkLabels(category);
  const status = result.status;
  const bookmarkers = result.context?.bookmarkers ?? [];
  const total       = result.context?.bookmarkersTotal ?? 0;
  const overflow    = Math.max(0, total - VISIBLE_AVATARS);

  // Headline + first-mover body come from the resolved moment when
  // present. Falls back to the inline copy so day-1 behaviour is
  // preserved if migration 026/027 hasn't been applied.
  const moment = result.moment ?? null;
  const categoryListLabel = listLabel(category);
  const fallbackTitle     = `Αποθηκεύτηκε\nστις ${categoryListLabel} σου!`;
  const titleText         = moment?.copy.title || fallbackTitle;
  const momentBody        = moment?.copy.body || "";

  // Status hint line — kept inline (structural, not edit-worthy).
  const statusLine = `Στη λίστα "${status === "wishlist" ? labels.wishlist : labels.done}"`;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bookmark-saved-title"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center px-5 transition-opacity duration-200 ease-soft",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/40 transition-opacity duration-200 ease-soft",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Card */}
      <div
        className={cn(
          "relative w-full max-w-[420px] rounded-[20px] bg-white shadow-2xl p-7 pt-9",
          "transition-all duration-280 ease-spring",
          visible ? "translate-y-0 scale-100" : "translate-y-4 scale-[0.97]",
        )}
      >
        {/* Close (X) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Κλείσιμο"
          className="absolute top-3 right-3 w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6"  y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Headline — sourced from moment.copy.title when set, with
         *  inline fallback. whitespace-pre-line preserves literal
         *  \n in templates so admins can split lines visually. */}
        <p
          id="bookmark-saved-title"
          className="text-center text-[26px] font-extrabold text-zinc-900 leading-[120%] tracking-[-0.01em] whitespace-pre-line"
        >
          <Bold>{titleText}</Bold>
        </p>

        {/* Status hint */}
        <p className="mt-3 text-center text-[13px] font-medium text-zinc-500">
          {statusLine}
        </p>

        {/* Avatar stack — only when there are other bookmarkers */}
        {bookmarkers.length > 0 && (
          <>
            <div className="mt-8 flex items-center justify-center flex-wrap gap-y-3">
              {bookmarkers.slice(0, VISIBLE_AVATARS).map((u, i) => (
                <span
                  key={u.handle + i}
                  className="rounded-full border-2 border-white overflow-hidden"
                  style={{ marginLeft: i === 0 ? 0 : -10, width: 56, height: 56 }}
                >
                  <AvatarImage url={u.avatar_url} name={u.display_name || u.handle} size={56} />
                </span>
              ))}
              {overflow > 0 && (
                <span
                  className="rounded-full border-2 border-white bg-zinc-900 text-white inline-flex items-center justify-center font-bold text-[13px]"
                  style={{ marginLeft: -10, width: 56, height: 56 }}
                >
                  +{overflow}
                </span>
              )}
            </div>

            <p className="mt-5 text-center text-[14px] font-medium text-zinc-600 leading-[140%]">
              {total === 1
                ? "1 ακόμη χρήστης την έχει προσθέσει στο προφίλ του"
                : `${total} ακόμη χρήστες την έχουν προσθέσει στο προφίλ τους`}
            </p>
          </>
        )}

        {/* First-mover body — from moment.copy.body when set
         *  (e.g. seeded "Είσαι ο πρώτος που το αποθηκεύει 🚀"),
         *  inline fallback otherwise. */}
        {bookmarkers.length === 0 && (
          <p className="mt-8 text-center text-[14px] font-medium text-zinc-600 leading-[140%]">
            <Bold>{momentBody || "Είσαι ο πρώτος που το αποθηκεύει 🚀"}</Bold>
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Inline **bold** parser — same as the AchievementUnlockedModal.
// Splits on **…** and wraps matches in <strong>. Pure string-to-React,
// no HTML injection risk.
function Bold({ children }: { children: string }) {
  const text = typeof children === "string" ? children : String(children ?? "");
  if (!text.includes("**")) return <>{text}</>;
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <strong key={i} className="text-zinc-900">{p}</strong>
          : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}

/**
 * Plural genitive (the "στις ___ σου" form) per category. Diverges
 * from `bookmarkLabels(category).noun` (singular) because the modal
 * line reads as a list: "in your movies", "in your books", etc.
 */
function listLabel(category: string): string {
  switch (category) {
    case "movies":  return "ταινίες";
    case "series":  return "σειρές";
    case "books":   return "βιβλία";
    case "food":    return "εστιατόρια";
    case "bars":    return "bars";
    case "hotels":  return "ξενοδοχεία";
    case "theater": return "παραστάσεις";
    case "events":  return "εκδηλώσεις";
    case "recipes": return "συνταγές";
    default:        return "λίστες";
  }
}
