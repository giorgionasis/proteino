"use client";

import { useId, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?:         React.Ref<HTMLTextAreaElement>;
  label?:       string;
  error?:       string;
  hint?:        string;
  maxLength?:   number;
  showCount?:   boolean;
  autoResize?:  boolean;
}

// ── Component ──────────────────────────────────────────────────
function Textarea({
  ref,
  label,
  error,
  hint,
  maxLength,
  showCount = false,
  autoResize = false,
  className,
  id: idProp,
  value,
  onChange,
  disabled,
  ...props
}: TextareaProps) {
  const generatedId = useId();
  const id          = idProp ?? generatedId;
  const innerRef    = useRef<HTMLTextAreaElement | null>(null);

  // Combine forwarded ref + inner ref
  function setRef(el: HTMLTextAreaElement | null) {
    innerRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref && "current" in ref) (ref as React.RefObject<HTMLTextAreaElement | null>).current = el;
  }

  // Auto-resize
  useEffect(() => {
    if (!autoResize || !innerRef.current) return;
    innerRef.current.style.height = "auto";
    innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
  }, [value, autoResize]);

  const charCount  = typeof value === "string" ? value.length : 0;
  const atLimit    = maxLength != null && charCount >= maxLength;

  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id}>{label}</label>}

      <textarea
        ref={setRef}
        id={id}
        value={value}
        onChange={onChange}
        maxLength={maxLength}
        disabled={disabled}
        className={cn(
          // Base
          "w-full bg-white text-sm text-gray-900",
          "placeholder:text-gray-400",
          "rounded-input px-4 py-3",
          "outline-none transition-all resize-none",

          // Border spec
          "border-[0.5px] border-gray-300",
          "focus:border-[1.5px] focus:border-coral-600",

          // Error
          error && "border-[0.5px] border-danger focus:border-[1.5px] focus:border-danger",

          // Disabled
          disabled && "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60",

          className,
        )}
        {...props}
      />

      {/* Footer: error | hint | char count */}
      <div className="flex items-start justify-between gap-2">
        <div>
          {error && (
            <p role="alert" className="text-xs text-danger leading-tight">{error}</p>
          )}
          {hint && !error && (
            <p className="text-xs text-gray-400 leading-tight">{hint}</p>
          )}
        </div>
        {(showCount || maxLength) && (
          <p className={cn("text-xs shrink-0", atLimit ? "text-danger" : "text-gray-400")}>
            {charCount}{maxLength != null && `/${maxLength}`}
          </p>
        )}
      </div>
    </div>
  );
}

export { Textarea };
