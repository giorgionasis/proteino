"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

interface HeaderProps {
  title?: string;
  showNotifications?: boolean;
}

export function Header({ title = "Proteino", showNotifications = true }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-4 h-14 flex items-center justify-between">
      <Link href="/" className="text-base font-medium text-gray-900">
        {title}
      </Link>
      {showNotifications && (
        <Link href="/notifications" className="relative p-1">
          <Bell size={22} strokeWidth={1.5} className="text-gray-600" />
          {/* Unread dot */}
          <span className="absolute top-1 right-1 w-2 h-2 bg-coral-600 rounded-full" />
        </Link>
      )}
    </header>
  );
}
