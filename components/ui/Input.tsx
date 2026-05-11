"use client";

import { forwardRef, useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:          string;
  labelClassName?: string;
  error?:          string;
  success?:        string;
  hint?:           string;
  leftIcon?:       React.ReactNode;
  rightIcon?:      React.ReactNode;
  variant?:        "default" | "search";
  loading?:        boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label, labelClassName, error, success, hint,
      leftIcon, rightIcon, loading = false, className,
      type, id: idProp, disabled,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const isPassword = type === "password";
    const inputType  = isPassword && showPassword ? "text" : type;
    const hasRight   = rightIcon || isPassword;
    const isSearch   = variant === "search";

    const hasError   = !!error;
    const hasSuccess = !!success && !hasError;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={id}
            className={cn("text-base font-bold text-zinc-800", labelClassName)}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              aria-hidden
              className="absolute left-4 flex items-center justify-center pointer-events-none text-zinc-400"
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
              // 200ms ease-soft for the focus transition — explicit
              // values so the focus state doesn't snap. Animates
              // border-color + bg + outline together.
              "w-full font-semibold text-zinc-800 outline-none transition-[border-color,background-color] duration-200 ease-soft",
              "placeholder:text-zinc-500 placeholder:font-semibold placeholder:text-base",

              // Default (auth) variant
              !isSearch && [
                "h-14 bg-white rounded-sm",
                "border border-zinc-400",
                "focus:border-2 focus:border-zinc-800",
                "text-lg",   // 18px for typed value
                leftIcon  ? "pl-10" : "pl-4",
                hasRight  ? "pr-10" : "pr-4",
              ],

              // Search variant
              isSearch && [
                "h-11 bg-ios-gray rounded-search border-0 text-base",
                leftIcon ? "pl-10" : "pl-4",
                hasRight ? "pr-10" : "pr-4",
              ],

              // Error state
              hasError && !isSearch && [
                "!border-2 !border-[#FE402B] !bg-[#FFF2F1]",
                "focus:!border-[#FE402B]",
              ],

              // Success state
              hasSuccess && !isSearch && [
                "!border-2 !border-[#019371] !bg-white",
                "focus:!border-[#019371]",
              ],

              disabled && "opacity-50 cursor-not-allowed",
              className,
            )}
            {...props}
          />

          {/* Right side: spinner | eye | custom icon */}
          <span className="absolute right-3 flex items-center justify-center">
            {loading ? (
              <span className="w-5 h-5 rounded-full border-2 border-zinc-300 border-t-zinc-800 animate-spin-slow" aria-hidden />
            ) : isPassword ? (
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {showPassword
                  ? <EyeOff size={20} strokeWidth={1.5} />
                  : <Eye    size={20} strokeWidth={1.5} />
                }
              </button>
            ) : hasSuccess && !hasRight ? (
              <CheckCircleIcon />
            ) : rightIcon ? (
              <span aria-hidden className="text-zinc-400 pointer-events-none">{rightIcon}</span>
            ) : null}
          </span>
        </div>

        {hasError && (
          <p role="alert" className="text-sm font-semibold leading-tight" style={{ color: "#FE402B" }}>
            {error}
          </p>
        )}
        {hasSuccess && (
          <p className="text-sm font-semibold leading-tight" style={{ color: "#019371" }}>
            {success}
          </p>
        )}
        {hint && !hasError && !hasSuccess && (
          <p className="text-sm text-zinc-400 leading-tight">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };

function CheckCircleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="9" stroke="#019371" strokeWidth="1.5" />
      <path d="M6 10l3 3 5-6" stroke="#019371" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
