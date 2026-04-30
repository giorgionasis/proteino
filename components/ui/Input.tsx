"use client";

import { forwardRef, useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:          string;
  labelClassName?: string;
  error?:          string;
  hint?:           string;
  leftIcon?:       React.ReactNode;
  rightIcon?:      React.ReactNode;
  variant?:        "default" | "search";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label, labelClassName, error, hint,
      leftIcon, rightIcon, className,
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

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={id} className={cn("text-xs font-semibold text-zinc-500 uppercase tracking-[0.5px]", labelClassName)}>
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span
              aria-hidden
              className={cn(
                "absolute flex items-center justify-center pointer-events-none text-zinc-400",
                isSearch ? "left-4" : "left-3.5",
              )}
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
              "w-full text-sm text-zinc-800 outline-none transition-all",
              "placeholder:text-zinc-400",

              // Default (auth) variant
              !isSearch && [
                "h-11 bg-white rounded-input",
                "border border-zinc-200",
                "focus:border-coral-600 focus:border-[1.5px]",
                leftIcon ? "pl-10" : "pl-4",
                hasRight ? "pr-10" : "pr-4",
              ],

              // Search variant — iOS pill style
              isSearch && [
                "h-11 bg-ios-gray rounded-search",
                "border-0",
                leftIcon ? "pl-10" : "pl-4",
                hasRight ? "pr-10" : "pr-4",
              ],

              error     && "border-danger focus:border-danger",
              disabled  && "opacity-50 cursor-not-allowed",

              className,
            )}
            {...props}
          />

          {hasRight && (
            <span className="absolute right-3.5 flex items-center justify-center">
              {isPassword ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  {showPassword
                    ? <EyeOff size={16} strokeWidth={1.5} />
                    : <Eye    size={16} strokeWidth={1.5} />
                  }
                </button>
              ) : (
                <span aria-hidden className="text-zinc-400 pointer-events-none">{rightIcon}</span>
              )}
            </span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-xs text-danger leading-tight">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-zinc-400 leading-tight">{hint}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
export { Input };
