import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ──────────────────────────────────────────────────────
interface FABProps {
  href?:      string;
  onClick?:   () => void;
  icon?:      React.ReactNode;
  label?:     string;           // accessibility label
  className?: string;
}

// ── Component ──────────────────────────────────────────────────
export function FAB({ href, onClick, icon, label = "New suggestion", className }: FABProps) {
  const sharedClasses = cn(
    // Position: above the 64px bottom nav + 16px gap
    "fixed bottom-[calc(64px+16px)] right-4 z-30",
    // Shape
    "w-14 h-14 rounded-full",
    // Style
    "gradient-coral text-white shadow-fab",
    // Layout
    "flex items-center justify-center",
    // Interaction
    "transition-transform duration-150 active:scale-95 press-effect",
    className,
  );

  const content = (
    <>
      <span aria-hidden>{icon ?? <Plus size={24} strokeWidth={2} />}</span>
      <span className="sr-only">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={sharedClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={label} onClick={onClick} className={sharedClasses}>
      {content}
    </button>
  );
}
