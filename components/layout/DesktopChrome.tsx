"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Plus, Search } from "lucide-react";
import { useOverlay } from "@/hooks/useOverlay";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop chrome (≥1024px, session 40). The app is a mobile column; on
 * a laptop it used to float as a 390px strip in an empty grey page with
 * the phone tab bar and FAB mid-screen. These pieces give it a real site
 * frame — top bar + side rails — while the content column stays the
 * tested mobile layout. Everything here is `hidden lg:…`; phones are
 * unaffected.
 */

interface ChromeUser {
  isRegistered: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  handle: string | null;
  notificationCount: number;
}

export function DesktopTopBar({ user }: { user: ChromeUser }) {
  const { openSearch, openSuggestion } = useOverlay();
  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-zinc-200">
      <div className="max-w-[1180px] mx-auto px-6 h-16 flex items-center gap-6">
        <Link href="/" className="text-[22px] font-extrabold text-zinc-900 shrink-0">
          Proteino<span className="text-coral-600">.</span>
        </Link>

        <button
          type="button"
          onClick={() => openSearch()}
          className="flex-1 max-w-[520px] flex items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-4 h-11 text-left text-[15px] text-zinc-500 hover:border-zinc-300 transition-colors"
        >
          <Search size={18} className="text-coral-600" strokeWidth={2.25} />
          Πες μου τι ψάχνεις…
        </button>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => openSuggestion()}
            className="flex items-center gap-2 rounded-full gradient-coral text-white font-semibold text-[14px] px-4 h-10 shadow-fab hover:opacity-95"
          >
            <Plus size={18} strokeWidth={2.5} /> Πρότεινε
          </button>
          {user.isRegistered ? (
            <>
              <Link href="/notifications" aria-label="Ειδοποιήσεις" className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-zinc-100">
                <Bell size={20} className="text-zinc-700" />
                {user.notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-coral-600 text-white text-[11px] font-bold grid place-items-center">
                    {user.notificationCount > 9 ? "9+" : user.notificationCount}
                  </span>
                )}
              </Link>
              <Link href="/you" aria-label="Το προφίλ σου" className="rounded-full">
                <AvatarImage url={user.avatarUrl} name={user.displayName ?? "?"} size={36} className="rounded-full" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[14px] font-semibold text-zinc-800 px-3 h-10 grid place-items-center rounded-full hover:bg-zinc-100">Σύνδεση</Link>
              <Link href="/register" className="text-[14px] font-semibold text-white bg-zinc-900 px-4 h-10 grid place-items-center rounded-full hover:bg-zinc-800">Εγγραφή</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function DesktopLeftRail({ categories }: { categories: { slug: string; labelEl: string }[] }) {
  const pathname = usePathname() ?? "/";
  const linkCls = (active: boolean) =>
    cn(
      "block rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors",
      active ? "bg-coral-50 text-coral-700" : "text-zinc-700 hover:bg-zinc-100",
    );
  return (
    <nav aria-label="Κατηγορίες" className="hidden lg:block w-[220px] shrink-0">
      <div className="sticky top-[88px] flex flex-col gap-1">
        <Link href="/" className={linkCls(pathname === "/")}>Αρχική</Link>
        <p className="px-3 pt-4 pb-1 text-[12px] font-bold tracking-[0.1em] uppercase text-zinc-400">Κατηγορίες</p>
        {categories.map((c) => (
          <Link key={c.slug} href={`/${c.slug}`} className={linkCls(pathname === `/${c.slug}` || pathname.startsWith(`/${c.slug}/`))}>
            {c.labelEl}
          </Link>
        ))}
        <p className="px-3 pt-4 pb-1 text-[12px] font-bold tracking-[0.1em] uppercase text-zinc-400">Κοινότητα</p>
        <Link href="/leaderboard" className={linkCls(pathname === "/leaderboard")}>Κατάταξη</Link>
      </div>
    </nav>
  );
}

export function DesktopRightRail({ user }: { user: ChromeUser }) {
  return (
    <aside className="hidden xl:block w-[280px] shrink-0">
      <div className="sticky top-[88px] flex flex-col gap-5">
        {user.isRegistered ? (
          <div className="rounded-2xl bg-white border border-zinc-200 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <AvatarImage url={user.avatarUrl} name={user.displayName ?? "?"} size={44} className="rounded-full shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-zinc-900 truncate">{user.displayName}</p>
                {user.handle && <p className="text-[13px] text-zinc-500 truncate">@{user.handle}</p>}
              </div>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <Link href="/you" className="text-[14px] font-semibold text-zinc-700 hover:text-coral-700">Το προφίλ σου</Link>
              {user.handle && (
                <Link href={`/profile/${encodeURIComponent(user.handle)}/bookmarks`} className="text-[14px] font-semibold text-zinc-700 hover:text-coral-700">Η λίστα σου</Link>
              )}
              <Link href="/notifications" className="text-[14px] font-semibold text-zinc-700 hover:text-coral-700">Ειδοποιήσεις</Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-zinc-200 p-5 flex flex-col gap-3">
            <p className="text-[18px] font-extrabold text-zinc-900 leading-tight">Πρότεινε ό,τι αγαπάς</p>
            <p className="text-[14px] text-zinc-600 leading-[150%]">
              Βιβλία, ταινίες, μαγαζιά και συνταγές από αληθινούς ανθρώπους. Με λογαριασμό αποθηκεύεις λίστες,
              ακολουθείς ανθρώπους και παίρνεις προτάσεις για σένα.
            </p>
            <Link href="/register" className="mt-1 text-center text-[15px] font-bold text-white bg-zinc-900 rounded-full h-11 grid place-items-center hover:bg-zinc-800">
              Δημιούργησε λογαριασμό
            </Link>
            <Link href="/login" className="text-center text-[14px] font-semibold text-zinc-700 hover:text-coral-700">Έχω ήδη λογαριασμό</Link>
          </div>
        )}
        <nav aria-label="Σύνδεσμοι" className="px-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-zinc-500">
          <Link href="/help" className="hover:text-zinc-800">Βοήθεια</Link>
          <Link href="/support" className="hover:text-zinc-800">Επικοινωνία</Link>
          <Link href="/terms" className="hover:text-zinc-800">Όροι χρήσης</Link>
          <Link href="/privacy" className="hover:text-zinc-800">Απόρρητο</Link>
          <span>© {new Date().getFullYear()} Proteino</span>
        </nav>
      </div>
    </aside>
  );
}
