"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "black";
export type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant   = "primary",
      size      = "md",
      loading   = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      className,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base
          "relative inline-flex items-center justify-center gap-2 rounded-pill",
          "font-medium select-none transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-600 focus-visible:ring-offset-2",

          // Sizes
          size === "sm" && "h-9  px-4  text-xs  tracking-wide",
          size === "md" && "h-11 px-6  text-sm",
          size === "lg" && "h-13 px-8  text-base",

          // Variants — normal state
          variant === "primary"   && "gradient-coral text-white shadow-sm",
          variant === "secondary" && [
            "bg-coral-50 text-coral-600",
            "border-[0.5px] border-coral-500",
            "hover:bg-coral-100",
          ],
          variant === "ghost"     && "bg-transparent text-gray-600 hover:bg-gray-100",
          variant === "danger"    && [
            "bg-red-50 text-danger",
            "border-[0.5px] border-danger",
            "hover:bg-red-100",
          ],
          variant === "dark"      && "bg-white/10 text-white border-[0.5px] border-white/20 hover:bg-white/20",
          variant === "black"     && "bg-gray-900 text-white hover:bg-gray-800 active:bg-black",

          // Active / press feedback
          !isDisabled && "active:scale-[0.97]",

          // Disabled
          isDisabled && "opacity-40 cursor-not-allowed",

          // Full width
          fullWidth && "w-full",

          className,
        )}
        {...props}
      >
        {/* Left icon — hidden while loading */}
        {leftIcon && !loading && (
          <span className="shrink-0 -ml-0.5">{leftIcon}</span>
        )}

        {/* Spinner */}
        {loading && (
          <span
            aria-hidden
            className="shrink-0 w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin-slow"
          />
        )}

        {/* Label */}
        <span>{children}</span>

        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="shrink-0 -mr-0.5">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
export { Button };
