"use client";

import { forwardRef, useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:          string;
  labelClassName?: string;
  error?:          string;
  hint?:           string;
  leftIcon?:       React.ReactNode;
  rightIcon?:      React.ReactNode;
}

// ── Component ──────────────────────────────────────────────────
const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, labelClassName, error, hint, leftIcon, rightIcon, className, type, id: idProp, disabled, ...props },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const isPassword = type === "password";
    const inputType  = isPassword && showPassword ? "text" : type;

    const hasRight = rightIcon || isPassword;

    return (
      <div className="flex flex-col gap-1.5">
        {/* Label */}
        {label && (
          <label htmlFor={id} className={labelClassName}>{label}</label>
        )}

        {/* Input wrapper */}
        <div className="relative flex items-center">
          {/* Left icon */}
          {leftIcon && (
            <span
              aria-hidden
              className="absolute left-3.5 flex items-center justify-center text-gray-400 pointer-events-none"
            >
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            disabled={disabled}
            className={cn(
              // Base
              "w-full h-11 bg-white text-sm text-gray-900",
              "placeholder:text-gray-400",
              "rounded-input",
              "outline-none transition-all",

              // Border spec: 0.5px default → 1.5px focus
              "border-[0.5px] border-gray-300",
              "focus:border-[1.5px] focus:border-coral-600",

              // Padding — adjust for icons
              leftIcon  ? "pl-10" : "pl-4",
              hasRight  ? "pr-10" : "pr-4",

              // Error state
              error && "border-[0.5px] border-danger focus:border-[1.5px] focus:border-danger",

              // Disabled
              disabled && "bg-gray-50 text-gray-400 cursor-not-allowed opacity-60",

              className,
            )}
            {...props}
          />

          {/* Right: custom icon or password toggle */}
          {hasRight && (
            <span className="absolute right-3.5 flex items-center justify-center">
              {isPassword ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword
                    ? <EyeOff size={16} strokeWidth={1.5} />
                    : <Eye    size={16} strokeWidth={1.5} />
                  }
                </button>
              ) : (
                <span aria-hidden className="text-gray-400 pointer-events-none">
                  {rightIcon}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Messages */}
        {error && (
          <p role="alert" className="text-xs text-danger leading-tight">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-400 leading-tight">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
