"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/",       label: "HOME",   Icon: Home   },
  { href: "/search", label: "SEARCH", Icon: Search },
  { href: "/you",    label: "YOU",    Icon: User   },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 max-w-md mx-auto">
      <div className="flex items-stretch h-16">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors",
                active ? "text-coral-600" : "text-gray-400"
              )}
            >
              <Icon
                size={22}
                strokeWidth={active ? 2 : 1.5}
                className={cn(active && "text-coral-600")}
              />
              <span
                className={cn(
                  "text-[9px] font-medium tracking-widest",
                  active ? "text-coral-600" : "text-gray-400"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
