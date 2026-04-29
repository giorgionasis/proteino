import Image from "next/image";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?:        string | null;
  name?:       string;           // for initials fallback
  size?:       AvatarSize;
  verified?:   boolean;
  className?:  string;
  alt?:        string;
}

// ── Size map ───────────────────────────────────────────────────
const SIZE: Record<AvatarSize, { container: string; text: string; badge: string }> = {
  xs: { container: "w-6  h-6",  text: "text-[9px]",  badge: "w-2 h-2  border"   },
  sm: { container: "w-8  h-8",  text: "text-xs",     badge: "w-2.5 h-2.5 border"   },
  md: { container: "w-10 h-10", text: "text-sm",     badge: "w-3 h-3  border-[1.5px]" },
  lg: { container: "w-14 h-14", text: "text-lg",     badge: "w-3.5 h-3.5 border-2"   },
  xl: { container: "w-20 h-20", text: "text-xl",     badge: "w-4 h-4  border-2"   },
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Component ──────────────────────────────────────────────────
export function Avatar({ src, name = "", size = "md", verified = false, className, alt }: AvatarProps) {
  const s = SIZE[size];

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div
        className={cn(
          "rounded-full overflow-hidden bg-coral-50 flex items-center justify-center",
          s.container,
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={alt ?? name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <span
            aria-hidden
            className={cn("font-medium text-coral-600 select-none", s.text)}
          >
            {name ? initials(name) : "?"}
          </span>
        )}
      </div>

      {/* Verified badge */}
      {verified && (
        <span
          aria-label="Verified"
          className={cn(
            "absolute bottom-0 right-0 rounded-full bg-success border-white flex items-center justify-center",
            s.badge,
          )}
        >
          <svg viewBox="0 0 8 8" className="w-full h-full p-[1.5px]" fill="none">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </div>
  );
}
