"use client";

/**
 * useListKeyboard — keyboard navigation for admin list views.
 *
 * Active when the focus is NOT in a text input (so users can still type).
 *
 *   J / ↓  — next row
 *   K / ↑  — previous row
 *   Enter  — open active row (onOpen)
 *   /      — focus the list's search input
 *   Esc    — blur search / clear focus
 *   P      — onPublishToggle(activeIndex)   [optional]
 *   H      — onHide(activeIndex)             [optional]
 *   D      — onDelete(activeIndex)           [optional]
 *
 * Resets active index to 0 when the list shrinks past current.
 */

import { useEffect, useState, type RefObject } from "react";

interface Options {
  count: number;
  onOpen?: (index: number) => void;
  onPublishToggle?: (index: number) => void;
  onHide?: (index: number) => void;
  onDelete?: (index: number) => void;
  searchRef?: RefObject<HTMLInputElement | null>;
  /** Disabled when set true (e.g., a modal is open). */
  disabled?: boolean;
}

export function useListKeyboard({ count, onOpen, onPublishToggle, onHide, onDelete, searchRef, disabled }: Options) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Clamp when list shrinks
  useEffect(() => {
    if (activeIndex >= count) setActiveIndex(Math.max(0, count - 1));
  }, [count, activeIndex]);

  useEffect(() => {
    if (disabled) return;
    function isTyping(): boolean {
      const t = document.activeElement;
      if (!t) return false;
      const tag = t.tagName;
      // Allow / when search is unfocused, but otherwise honor inputs.
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t as HTMLElement).isContentEditable;
    }

    function onKey(e: KeyboardEvent) {
      // / focuses search even when not currently typing in another input
      if (e.key === "/" && !isTyping()) {
        e.preventDefault();
        searchRef?.current?.focus();
        searchRef?.current?.select?.();
        return;
      }
      // Esc blurs search
      if (e.key === "Escape" && document.activeElement === searchRef?.current) {
        searchRef.current?.blur();
        return;
      }
      if (isTyping()) return;
      if (count === 0) return;

      switch (e.key) {
        case "ArrowDown":
        case "j":
        case "J":
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, count - 1));
          break;
        case "ArrowUp":
        case "k":
        case "K":
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          onOpen?.(activeIndex);
          break;
        case "p":
        case "P":
          if (onPublishToggle) {
            e.preventDefault();
            onPublishToggle(activeIndex);
          }
          break;
        case "h":
        case "H":
          if (onHide) {
            e.preventDefault();
            onHide(activeIndex);
          }
          break;
        case "d":
        case "D":
          if (onDelete) {
            e.preventDefault();
            onDelete(activeIndex);
          }
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, activeIndex, onOpen, onPublishToggle, onHide, onDelete, searchRef, disabled]);

  return { activeIndex, setActiveIndex };
}
