"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";
import { useGuestGuard } from "@/hooks/useGuestGuard";
import { GuestPromptModal } from "@/components/guest/GuestPromptModal";

export interface FollowButtonProps {
  following?:  boolean;
  onToggle?:   (next: boolean) => void;
  className?:  string;
  size?:       "sm" | "md" | "lg";
  variant?:    "default" | "dark";
}

export function FollowButton({
  following  = false,
  onToggle,
  className,
  size = "md",
  variant = "default",
}: FollowButtonProps) {
  // Local state is seeded by `following` and stays in sync with prop
  // changes (so a parent that drives state via useFollow() can flip
  // this button externally). Existing uncontrolled callers — which
  // never mutate `following` after mount — keep their old behavior.
  const [active, setActive] = useState(following);
  useEffect(() => { setActive(following); }, [following]);
  const { requireAuth, modalProps } = useGuestGuard("να ακολουθήσεις");

  const toggle = () => {
    requireAuth(() => {
      const next = !active;
      setActive(next);
      onToggle?.(next);
    });
  };

  const iconName = active ? "followed" : "follow";

  // Re-mount icon + label every state flip via the `active` key so
  // they enter with `animate-pop-in` (scale 0.85 → 1.05 → 1, 300ms
  // ease-pop). Button bg crossfade is handled by transition-all.
  const stateKey = active ? "on" : "off";

  if (variant === "dark") {
    return (
      <>
        <button
          onClick={toggle}
          className={cn(
            "inline-flex items-center justify-center gap-2.5 rounded-full font-semibold",
            "transition-all duration-300 ease-soft select-none active:scale-[0.97]",
            "px-7 py-5 text-lg",
            active
              ? "bg-[#E5FFF9] text-[#033C2E]"
              : "bg-zinc-800 text-zinc-50",
            className,
          )}
        >
          <span key={`icon-${stateKey}`} className="inline-flex animate-pop-in">
            <Icon name={iconName} size={20} />
          </span>
          <span key={`label-${stateKey}`} className="animate-pop-in">
            {active ? "Ακολουθείς" : "Ακολούθησε"}
          </span>
        </button>
        <GuestPromptModal {...modalProps} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={toggle}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-[20px] font-semibold",
          "transition-all duration-300 ease-soft select-none active:scale-[0.97]",
          size === "sm" && "h-8 px-4 text-sm",
          size === "md" && "h-10 px-5 text-sm",
          size === "lg" && "h-11 px-6 text-base",
          active
            ? "bg-[#E5FFF9] text-[#033C2E]"
            : "bg-zinc-100 text-zinc-700",
          className,
        )}
      >
        <span key={`icon-${stateKey}`} className="inline-flex animate-pop-in">
          <Icon name={iconName} size={size === "lg" ? 18 : 16} />
        </span>
        <span key={`label-${stateKey}`} className="animate-pop-in">
          {active ? "Ακολουθείς" : "Ακολούθησε"}
        </span>
      </button>
      <GuestPromptModal {...modalProps} />
    </>
  );
}
