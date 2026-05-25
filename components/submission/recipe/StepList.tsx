"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * Numbered-step editor. Each step is one <textarea> (auto-grows so the
 * user sees the whole step). Paste-block-friendly: pasting a chunk of
 * text with newlines into an empty step splits on \n+ and creates a
 * new step per line — kills the friction of pasting a recipe printout.
 *
 * Pressing Enter at the end of a non-empty step adds a new step
 * (Shift+Enter inserts a line break within the same step, the normal
 * textarea behaviour).
 */
export function StepList({ value, onChange }: Props) {
  const lastRef = useRef<HTMLTextAreaElement | null>(null);

  const setStep = (idx: number, text: string) => {
    onChange(value.map((s, i) => (i === idx ? text : s)));
  };

  const removeStep = (idx: number) => {
    if (value.length === 1) {
      onChange([""]);
      return;
    }
    onChange(value.filter((_, i) => i !== idx));
  };

  const addStep = (afterIdx?: number) => {
    if (typeof afterIdx === "number") {
      const next = [...value];
      next.splice(afterIdx + 1, 0, "");
      onChange(next);
    } else {
      onChange([...value, ""]);
    }
    requestAnimationFrame(() => {
      lastRef.current?.focus();
    });
  };

  const handlePaste = (
    e: React.ClipboardEvent<HTMLTextAreaElement>,
    idx: number,
  ) => {
    const pasted = e.clipboardData.getData("text/plain");
    if (!pasted.includes("\n")) return; // single line — let default paste run
    const lines = pasted
      .split(/\r?\n+/)
      .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim()) // strip leading "1." / "2)" numbering
      .filter(Boolean);
    if (lines.length <= 1) return;
    e.preventDefault();
    // Replace the current empty step with the first line, then insert
    // the remaining lines as new steps after it.
    const next = [...value];
    const current = next[idx];
    const merged = current ? `${current} ${lines[0]}` : lines[0];
    next.splice(idx, 1, merged, ...lines.slice(1));
    onChange(next);
  };

  const autosize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  return (
    <div className="space-y-3">
      {value.map((step, i) => {
        const isLast = i === value.length - 1;
        return (
          <div key={i} className="flex gap-3 items-start">
            <span className="w-7 h-7 flex items-center justify-center bg-coral-600 text-white text-sm font-bold rounded-full shrink-0 mt-1 tabular-nums">
              {i + 1}
            </span>
            <textarea
              ref={(el) => {
                autosize(el);
                if (isLast) lastRef.current = el;
              }}
              value={step}
              onChange={(e) => {
                setStep(i, e.target.value);
                autosize(e.currentTarget);
              }}
              onPaste={(e) => handlePaste(e, i)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && step.trim()) {
                  e.preventDefault();
                  addStep(i);
                }
              }}
              placeholder="Περιγραφή βήματος…"
              rows={1}
              className={cn(
                "flex-1 px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg",
                "resize-none focus:outline-none focus:border-zinc-400",
                "placeholder:text-zinc-400 leading-relaxed",
              )}
            />
            <button
              type="button"
              onClick={() => removeStep(i)}
              aria-label="Διαγραφή βήματος"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500 hover:bg-zinc-50 mt-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => addStep()}
        className="text-sm font-medium text-coral-600 active:text-coral-700"
      >
        + Πρόσθεσε βήμα
      </button>
    </div>
  );
}
