"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import type { NotificationItem } from "@/lib/notifications";

interface Props {
  unread: NotificationItem[];
  read: NotificationItem[];
}

export function NotificationsPage({ unread, read }: Props) {
  const router = useRouter();
  const total = unread.length + read.length;

  return (
    <div className="bg-white">
      <header
        className="sticky top-0 z-30 bg-white flex items-center justify-between h-14"
        style={{ boxShadow: "0px 1px 7px -2px rgba(0,0,0,0.15)" }}
      >
        <span className="pl-6 text-[22px] font-bold leading-tight text-[#18181B]">
          Ειδοποιήσεις
        </span>
        <button
          onClick={() => router.back()}
          aria-label="Κλείσιμο"
          className="w-12 h-12 flex items-center justify-center mr-1.5 rounded-full active:bg-zinc-100 transition-colors"
        >
          <X size={20} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </header>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <>
          {unread.length > 0 && (
            <Section title="Νέες">
              {unread.map((n, i) => (
                <NotificationRow key={n.id} n={n} isLast={i === unread.length - 1} />
              ))}
            </Section>
          )}
          {read.length > 0 && (
            <Section title="Παλιότερες">
              {read.map((n, i) => (
                <NotificationRow key={n.id} n={n} isLast={i === read.length - 1} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pt-1 pb-6 flex flex-col">
      <div className="pl-5 h-12 flex items-center">
        <span className="text-lg font-bold text-[#27272A]">{title}</span>
      </div>
      <div className="flex flex-col">
        {children}
      </div>
    </section>
  );
}

/* ── Type-aware notification row ───────────────────────────── */

function NotificationRow({ n, isLast }: { n: NotificationItem; isLast: boolean }) {
  // Resolve href + visual based on type
  const { href, content, thumbnail } = renderNotification(n);

  const inner = (
    <div className={`flex items-start gap-3 pl-5 pr-5 py-3 active:bg-zinc-50 transition-colors ${
      !n.is_read ? "bg-coral-50/30" : ""
    }`}>
      {thumbnail}
      <div className="flex-1 min-w-0">
        <p className="text-base text-[#18181B] leading-snug">{content}</p>
        <p className="text-xs text-zinc-400 mt-1">{formatRelative(n.created_at)}</p>
      </div>
      {!n.is_read && (
        <span className="w-2 h-2 rounded-full bg-coral-600 mt-2 shrink-0" aria-label="μη αναγνωσμένο" />
      )}
    </div>
  );

  return (
    <>
      {href ? (
        <Link
          href={href}
          onClick={() => markRead(n.id)}
          className="block"
        >
          {inner}
        </Link>
      ) : (
        <button
          onClick={() => markRead(n.id)}
          className="text-left block w-full"
        >
          {inner}
        </button>
      )}
      {!isLast && <div className="h-px w-full bg-[#F2F2F7]" />}
    </>
  );
}

function markRead(id: string) {
  fetch(`/api/notifications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_read: true }),
  }).catch(() => { /* silent */ });
}

interface RenderResult {
  content: React.ReactNode;
  href: string | null;
  thumbnail: React.ReactNode;
}

function renderNotification(n: NotificationItem): RenderResult {
  const cover = n.itemCover ?? null;
  const slug: string | null = n.itemSlug ?? null;
  const p = n.payload;

  switch (n.type) {
    case "movie_airing":
      return {
        href: slug,
        content: <>
          <strong className="font-bold">📺 {p.movie_title ?? "Η ταινία σου"}</strong>
          {" "}παίζει στο{" "}
          <strong className="font-bold">{p.channel}</strong>
          {" "}{formatAirSlot(p.air_date, p.air_time)}.
        </>,
        thumbnail: (
          <Thumb cover={cover} fallback="📺" />
        ),
      };

    case "rating":
      return {
        href: slug,
        content: <>
          {p.user_name && <strong className="font-bold">{p.user_name}</strong>}
          {p.user_name ? " αξιολόγησε" : "Νέα αξιολόγηση"}
          {p.score && <> με {p.score} αστέρια</>}
          {p.item_title && <> την πρότασή σου <strong className="font-bold">{p.item_title}</strong></>}
        </>,
        thumbnail: <Thumb cover={cover} avatar={p.user_avatar} fallback="⭐" />,
      };

    case "comment":
      return {
        href: slug,
        content: <>
          <strong className="font-bold">{p.user_name ?? "Κάποιος"}</strong>
          {" "}σχολίασε στην πρότασή σου
          {p.item_title && <> <strong className="font-bold">{p.item_title}</strong></>}
        </>,
        thumbnail: <Thumb cover={cover} avatar={p.user_avatar} fallback="💬" />,
      };

    case "follow":
      return {
        href: p.follower_handle ? `/profile/${p.follower_handle}` : null,
        content: <>
          <strong className="font-bold">{p.follower_name ?? "Νέος χρήστης"}</strong>
          {" "}σε ακολούθησε.
        </>,
        thumbnail: <Thumb avatar={p.follower_avatar} fallback="👤" />,
      };

    case "achievement":
      return {
        href: p.profile_handle ? `/profile/${p.profile_handle}` : null,
        content: <>
          🏆 Κέρδισες τη διάκριση{" "}
          <strong className="font-bold">{p.badge_name ?? n.name}</strong>!
        </>,
        thumbnail: <Thumb fallback="🏆" />,
      };

    case "suggestion_published":
      return {
        href: slug,
        content: <>
          Η πρότασή σου{" "}
          {p.item_title && <strong className="font-bold">{p.item_title}</strong>}
          {" "}έχει δημοσιευτεί.
        </>,
        thumbnail: <Thumb cover={cover} fallback="✓" />,
      };

    default:
      return {
        href: slug,
        content: <span>{n.name}</span>,
        thumbnail: <Thumb cover={cover} fallback="🔔" />,
      };
  }
}

function Thumb({ cover, avatar, fallback }: { cover?: string | null; avatar?: string | null; fallback: string }) {
  const url = cover ?? avatar;
  if (url) {
    return (
      <div className="w-11 h-11 rounded overflow-hidden shrink-0 bg-zinc-100">
        <img src={url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded shrink-0 bg-zinc-100 flex items-center justify-center text-xl">
      {fallback}
    </div>
  );
}

/* ── Helpers ───────────────────────────────────────────────── */

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "μόλις τώρα";
  if (mins < 60) return `${mins} λεπτά πριν`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ώρες πριν`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "χθες";
  if (days < 30) return `${days} μέρες πριν`;
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "short" });
}

function formatAirSlot(date: string | undefined, time: string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((d.getTime() - today.getTime()) / dayMs);
  const t = time ? time.slice(0, 5) : "";
  if (diffDays === 0) return `σήμερα${t ? ` στις ${t}` : ""}`;
  if (diffDays === 1) return `αύριο${t ? ` στις ${t}` : ""}`;
  if (diffDays > 0 && diffDays < 7) {
    return `σε ${diffDays} μέρες${t ? ` στις ${t}` : ""}`;
  }
  return d.toLocaleDateString("el-GR", { day: "numeric", month: "short" }) + (t ? ` στις ${t}` : "");
}

function EmptyState() {
  return (
    <div className="text-center py-20 px-6">
      <div className="text-5xl mb-3">🔕</div>
      <h2 className="text-lg font-bold text-zinc-800 mb-1">Όλα ήσυχα</h2>
      <p className="text-sm text-zinc-500 max-w-xs mx-auto">
        Όταν κάποιος αξιολογήσει, σχολιάσει ή σε ακολουθήσει, θα το δεις εδώ.
      </p>
    </div>
  );
}
