"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AvatarImage } from "@/components/ui/AvatarImage";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Source key for the live-counter badge (matches /api/admin/counters response). */
  counterKey?: "unpublishedSuggestions" | "reportedComments" | "dataQualityIssues" | "pendingReports";
  /** Visual tone for the badge. */
  counterTone?: "red" | "amber";
}

interface NavSection {
  /** Uppercase header above the section. Omit on the first (Overview) section. */
  label?: string;
  /** Optional one-line hint shown faded next to the label. */
  hint?: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    items: [
      { label: "Overview", href: "/admin", icon: <IconGrid /> },
    ],
  },
  {
    label: "Moderation",
    items: [
      { label: "Reports",      href: "/admin/reports",      icon: <IconFlag />,    counterKey: "pendingReports",          counterTone: "red"   },
      { label: "Suggestions",  href: "/admin/suggestions",  icon: <IconPencil />,  counterKey: "unpublishedSuggestions",  counterTone: "red"   },
      { label: "Data Quality", href: "/admin/data-quality", icon: <IconAlert />,   counterKey: "dataQualityIssues",       counterTone: "amber" },
    ],
  },
  {
    label: "Content",
    hint: "what users see",
    items: [
      { label: "Layout",           href: "/admin/layout",                 icon: <IconLayout /> },
      { label: "Related Sections", href: "/admin/related-sections",       icon: <IconLink /> },
      { label: "Collections",      href: "/admin/content/collections",    icon: <IconCollection /> },
      { label: "Movies Tonight",   href: "/admin/content/movies-tonight", icon: <IconFilm /> },
      { label: "Activities",       href: "/admin/content/activities",     icon: <IconMap /> },
    ],
  },
  {
    label: "Taxonomy",
    hint: "platform vocabulary",
    items: [
      { label: "Categories",   href: "/admin/categories",      icon: <IconFolder /> },
      { label: "Regions",      href: "/admin/content/regions", icon: <IconMap /> },
      { label: "Filters",      href: "/admin/content/filters", icon: <IconSliders /> },
      { label: "Extra Fields", href: "/admin/extra-fields",    icon: <IconDiamond /> },
    ],
  },
  {
    label: "Engagement",
    items: [
      { label: "Moments",  href: "/admin/moments",  icon: <IconConfetti /> },
      { label: "AI Usage", href: "/admin/ai-usage", icon: <IconSparkles /> },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Users", href: "/admin/users", icon: <IconUsers /> },
    ],
  },
  {
    label: "Platform",
    items: [
      { label: "Settings",          href: "/admin/settings", icon: <IconSettings /> },
      { label: "Comments (Legacy)", href: "/admin/reviews",  icon: <IconStar />,    counterKey: "reportedComments", counterTone: "red" },
      { label: "Showcase",          href: "/admin/showcase", icon: <IconPalette /> },
    ],
  },
];

interface Counters {
  unpublishedSuggestions: number;
  reportedComments: number;
  dataQualityIssues: number;
  pendingReports: number;
}

interface Props {
  user: {
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
}

export function AdminSidebar({ user }: Props) {
  const pathname = usePathname();
  const [counters, setCounters] = useState<Counters>({
    unpublishedSuggestions: 0,
    reportedComments: 0,
    dataQualityIssues: 0,
    pendingReports: 0,
  });

  // Poll counters every 60s — gives admins a live "needs attention" signal
  // without expensive fetches. Pathname change also re-fetches so action you
  // just took (publishing, hiding) updates the badge immediately.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/counters", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setCounters(data);
      } catch { /* offline — keep last values */ }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 w-[220px] h-screen bg-white border-r border-zinc-200 flex flex-col z-30">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/admin" className="flex items-baseline gap-[2px] select-none">
          <span className="text-[22px] font-black text-zinc-800 tracking-tight leading-none">
            Proteino
          </span>
          <span className="w-[5px] h-[5px] rounded-full bg-[#FE6F5E] mb-[3px]" />
        </Link>
      </div>

      {/* Search hint — clicking dispatches Cmd+K to open the palette */}
      <button
        onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
        }}
        className="mx-3 mb-4 flex items-center gap-2 px-3 h-9 rounded-md text-sm text-zinc-500 bg-zinc-50 hover:bg-zinc-100 transition-colors"
        aria-label="Search"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" className="shrink-0">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="flex-1 text-left">Search</span>
        <kbd className="text-[10px] font-mono text-zinc-400 border border-zinc-200 rounded px-1.5 py-0.5 bg-white">
          ⌘K
        </kbd>
      </button>

      {/* Nav — sections with optional uppercase headers + hairline dividers */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {NAV.map((section, sectionIdx) => (
          <div key={section.label ?? `section-${sectionIdx}`} className={sectionIdx > 0 ? "pt-3 mt-2 border-t border-zinc-100" : ""}>
            {section.label && (
              <div className="px-3 pb-1.5 flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-zinc-400">
                  {section.label}
                </span>
                {section.hint && (
                  <span className="text-[10px] text-zinc-300 truncate">— {section.hint}</span>
                )}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarLink key={item.href} item={item} active={isActive(item.href)} counters={counters} />
              ))}
            </div>
          </div>
        ))}
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

function SidebarLink({ item, active, counters }: { item: NavItem; active: boolean; counters?: Counters }) {
  const count = item.counterKey && counters ? counters[item.counterKey] : 0;
  const showCounter = count > 0;
  const tone = item.counterTone ?? "red";

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 h-9 rounded-md text-sm transition-colors ${
        active
          ? "bg-zinc-50 text-zinc-900 font-semibold border-l-[3px] border-emerald-600 -ml-[3px] pl-[15px]"
          : "text-zinc-600 hover:bg-zinc-50"
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {showCounter && (
        <span
          className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
            tone === "red" ? "bg-red-500 text-white" : "bg-amber-500 text-white"
          }`}
          aria-label={`${count} need attention`}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
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
function IconFlag() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
}
function IconUsers() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
}
function IconAlert() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}
function IconSparkles() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>;
}
function IconConfetti() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5.8 11.3L2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="M22 2L12 12"/></svg>;
}
function IconPalette() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"/><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"/><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"/><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z"/></svg>;
}
function IconSettings() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IconLayout() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>;
}
function IconLink() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
}
