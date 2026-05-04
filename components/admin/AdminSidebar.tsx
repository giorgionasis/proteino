"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

const NAV: NavEntry[] = [
  { label: "Overview",     href: "/admin",              icon: <IconGrid /> },
  { label: "Categories",   href: "/admin/categories",   icon: <IconFolder /> },
  { label: "Suggestions",  href: "/admin/suggestions",  icon: <IconPencil /> },
  { label: "Extra Fields", href: "/admin/extra-fields",  icon: <IconDiamond /> },
  { label: "Data Quality", href: "/admin/data-quality", icon: <IconAlert /> },
  {
    label: "Content",
    icon: <IconLayers />,
    children: [
      { label: "Collections",    href: "/admin/content/collections",    icon: <IconCollection /> },
      { label: "Activities",     href: "/admin/content/activities",     icon: <IconMap /> },
      { label: "Filters",        href: "/admin/content/filters",        icon: <IconSliders /> },
      { label: "Movies Tonight", href: "/admin/content/movies-tonight", icon: <IconFilm /> },
    ],
  },
  { label: "Reviews",  href: "/admin/reviews",  icon: <IconStar /> },
  { label: "Users",    href: "/admin/users",    icon: <IconUsers /> },
  { label: "Settings", href: "/admin/settings", icon: <IconSettings /> },
];

interface Props {
  user: {
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
}

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const [contentOpen, setContentOpen] = useState(true);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 w-[220px] h-screen bg-white border-r border-zinc-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 pt-6 pb-8">
        <Link href="/admin" className="flex items-baseline gap-[2px] select-none">
          <span className="text-[22px] font-black text-zinc-800 tracking-tight leading-none">
            Proteino
          </span>
          <span className="w-[5px] h-[5px] rounded-full bg-[#FE6F5E] mb-[3px]" />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV.map((entry) => {
          if (isGroup(entry)) {
            const groupActive = entry.children.some((c) => isActive(c.href));
            return (
              <div key={entry.label}>
                <button
                  onClick={() => setContentOpen((v) => !v)}
                  className={`w-full flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors ${
                    groupActive ? "text-zinc-900 font-semibold" : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center shrink-0">{entry.icon}</span>
                  <span className="flex-1 text-left">{entry.label}</span>
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    className={`text-zinc-400 transition-transform ${contentOpen ? "rotate-180" : ""}`}
                  >
                    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {contentOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {entry.children.map((child) => (
                      <SidebarLink key={child.href} item={child} active={isActive(child.href)} />
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return <SidebarLink key={entry.href} item={entry} active={isActive(entry.href)} />;
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-zinc-100 flex items-center gap-3">
        <AvatarImage url={user.avatar_url} name={user.display_name} size={36} className="rounded-full shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-800 truncate">{user.display_name}</p>
          <p className="text-xs text-zinc-500">Administrator</p>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors ${
        active
          ? "bg-zinc-50 text-zinc-900 font-semibold border-l-[3px] border-emerald-600 -ml-[3px] pl-[15px]"
          : "text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

/* ── Inline SVG icons (16×16) ──────────────────────────────── */

function IconGrid() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
}
function IconFolder() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>;
}
function IconPencil() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z"/></svg>;
}
function IconDiamond() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l10 10-10 10L2 12z"/></svg>;
}
function IconLayers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>;
}
function IconCollection() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>;
}
function IconMap() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16"/><path d="M16 6v16"/></svg>;
}
function IconSliders() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
}
function IconFilm() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>;
}
function IconStar() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IconAlert() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function IconSettings() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
