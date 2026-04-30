"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useOverlay } from "@/hooks/useOverlay";

export function BottomNav() {
  const pathname = usePathname();
  const { openSearch } = useOverlay();

  const isHome   = pathname === "/";
  const isSearch = false; // search is an overlay, never a route
  const isYou    = pathname.startsWith("/you") || pathname.startsWith("/profile/me");

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-white border-t border-zinc-200",
        "max-w-lg mx-auto",
        // Safe area padding for iOS Safari toolbar
        "pb-safe",
      )}
    >
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
          icon={<User size={22} strokeWidth={isYou ? 2.5 : 1.5} />}
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
