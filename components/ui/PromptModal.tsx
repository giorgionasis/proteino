"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal";

interface PromptModalProps {
  open: boolean;
  title: string;
  description?: string;
  placeholder?: string;
  initialValue?: string;
  minLength?: number;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** When true, renders a textarea instead of single-line input. */
  multiline?: boolean;
  onConfirm: (value: string) => void;
  onClose: () => void;
}

/**
 * Replacement for native `prompt()` — modal with a single text input.
 * Used by admin moderation flows that need a justification string
 * (≥5 chars typically). Caller controls open/close.
 */
export function PromptModal({
  open,
  title,
  description,
  placeholder,
  initialValue = "",
  minLength = 0,
  confirmLabel = "OK",
  cancelLabel = "Άκυρο",
  tone = "default",
  multiline = false,
  onConfirm,
  onClose,
}: PromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Reset on each open and focus.
  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, initialValue]);

  const trimmed = value.trim();
  const tooShort = trimmed.length < minLength;
  const confirmDisabled = tooShort;

  function submit() {
    if (confirmDisabled) return;
    onConfirm(trimmed);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  }

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-700 active:bg-red-700 text-white"
      : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 text-white";

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" showHandle={false}>
      <div className="px-5 py-4 space-y-4">
        {description && (
          <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>
        )}
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={4}
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100 resize-none"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            className="w-full h-10 px-3 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-coral-600 focus:ring-2 focus:ring-coral-100"
          />
        )}
        {minLength > 0 && (
          <p className={`text-[11px] ${tooShort && value.length > 0 ? "text-red-600" : "text-zinc-400"}`}>
            {tooShort
              ? `Χρειάζονται τουλάχιστον ${minLength} χαρακτήρες (${trimmed.length}/${minLength})`
              : `${trimmed.length} χαρακτήρες`}
          </p>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={confirmDisabled}
            className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
