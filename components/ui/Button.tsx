"use client";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dark" | "black";
export type ButtonSize    = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?:       React.Ref<HTMLButtonElement>;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

function Button({
  ref,
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
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 rounded-full",
        "font-semibold select-none transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-600 focus-visible:ring-offset-2",

        size === "sm" && "h-9  px-4  text-sm  tracking-wide",
        size === "md" && "h-11 px-6  text-base",
        size === "lg" && "h-13 px-8  text-base",

        variant === "primary" && "gradient-coral text-white",
        variant === "secondary" && [
          "bg-coral-50 text-coral-600",
          "border border-coral-600/30",
          "hover:bg-coral-100",
        ],
        variant === "ghost"   && "bg-transparent text-zinc-600 hover:bg-zinc-100",
        variant === "danger"  && [
          "bg-red-50 text-danger",
          "border border-danger/30",
          "hover:bg-red-100",
        ],
        variant === "dark"    && "bg-white/10 text-white border border-white/20 hover:bg-white/20",
        variant === "black"   && "bg-zinc-800 text-white hover:bg-zinc-950",

        !isDisabled && "active:scale-[0.97]",
        isDisabled  && "opacity-40 cursor-not-allowed",
        fullWidth   && "w-full",

        className,
      )}
      {...props}
    >
      {leftIcon && !loading && (
        <span className="shrink-0 -ml-0.5">{leftIcon}</span>
      )}
      {loading && (
        <span
          aria-hidden
          className="shrink-0 w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin-slow"
        />
      )}
      <span>{children}</span>
      {rightIcon && !loading && (
        <span className="shrink-0 -mr-0.5">{rightIcon}</span>
      )}
    </button>
  );
}

export { Button };
