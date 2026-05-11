"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/hooks/useOverlay";
import { AvatarImage } from "@/components/ui/AvatarImage";

interface BottomNavProps {
  avatarUrl?: string | null;
  /** Used for the initials fallback when avatarUrl is null (mirrors the
   *  profile page's <AvatarImage> behavior so YOU tab + profile match). */
  displayName?: string | null;
}

export function BottomNav({ avatarUrl, displayName }: BottomNavProps) {
  const pathname = usePathname();
  const { openSearch } = useOverlay();

  const isHome   = pathname === "/";
  const isSearch = false; // search is an overlay, never a route
  const isYou    = pathname.startsWith("/you") || pathname.startsWith("/profile/");

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white border-t border-zinc-200",
        "max-w-[390px] mx-auto",
        // Safe area padding for iOS Safari toolbar
        "pb-safe",
      )}
    >
      {/* Sliding active indicator — 2px coral bar at the TOP of the
       *  active tab. Translates between HOME/SEARCH/YOU positions so
       *  the active state has motion instead of just color-flipping.
       *  Each tab is `flex-1` (33.33%), so we use percent translate. */}
      {(isHome || isYou) && (
        <span
          aria-hidden
          className="absolute top-0 left-0 h-[2px] w-1/3 bg-coral-600 transition-transform duration-300 ease-spring will-change-transform"
          style={{ transform: `translateX(${isHome ? 0 : 200}%)` }}
        />
      )}

      <div className="flex items-stretch h-16">
        {/* HOME */}
        <NavItem
          href="/"
          label="HOME"
          icon={<Home size={22} strokeWidth={isHome ? 2.5 : 1.5} />}
          active={isHome}
        />

        {/* SEARCH — opens overlay, not a route */}
        <button
          onClick={openSearch}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1",
            "transition-colors select-none",
            isSearch ? "text-coral-600" : "text-zinc-400",
          )}
        >
          <Search size={22} strokeWidth={isSearch ? 2.5 : 1.5} />
          <span className={cn(
            "text-[9px] font-semibold tracking-widest uppercase",
            isSearch ? "text-coral-600" : "text-zinc-400",
          )}>
            SEARCH
          </span>
        </button>

        {/* YOU */}
        <NavItem
          href="/you"
          label="YOU"
          icon={(avatarUrl || displayName) ? (
            <div
              className="rounded-full overflow-hidden shrink-0 transition-all duration-200 ease-soft"
              style={{
                width: 24, height: 24,
                outline: isYou ? "2px solid #FE6F5E" : "1.5px solid #a1a1aa",
                outlineOffset: 1,
              }}
            >
              <AvatarImage
                url={avatarUrl}
                name={displayName}
                size={24}
                className="rounded-full"
              />
            </div>
          ) : (
            <User size={22} strokeWidth={isYou ? 2.5 : 1.5} />
          )}
          active={isYou}
        />
      </div>
    </nav>
  );
}

interface NavItemProps {
  href:   string;
  label:  string;
  icon:   React.ReactNode;
  active: boolean;
}

function NavItem({ href, label, icon, active }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-1",
        "transition-colors select-none",
        active ? "text-coral-600" : "text-zinc-400",
      )}
    >
      {icon}
      <span className={cn(
        "text-[9px] font-semibold tracking-widest uppercase",
        active ? "text-coral-600" : "text-zinc-400",
      )}>
        {label}
      </span>
    </Link>
  );
}
