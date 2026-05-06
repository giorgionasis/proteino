import type { ReactNode } from "react";

export type NotificationKind =
  | "movie_airing"
  | "rating"
  | "comment"
  | "follow"
  | "achievement"
  | "suggestion_published";

interface NotificationCardProps {
  type: NotificationKind;
  /** Pre-formatted content (typically `<>...<strong>X</strong>...</>`). */
  content: ReactNode;
  /** Pre-formatted relative date — "μόλις τώρα" / "χθες" / "πριν 2 μέρες" / "Φεβ 24". */
  date: string;
  /** True for unread → coral-tinted bg + coral dot on the right. */
  unread?: boolean;
  /** Item cover or user avatar. Falls back to fallback emoji. */
  imageUrl?: string | null;
  /** Single emoji or short string used when no image. */
  fallbackEmoji?: string;
}

const FALLBACK_BY_TYPE: Record<NotificationKind, string> = {
  movie_airing: "📺",
  rating: "⭐",
  comment: "💬",
  follow: "👤",
  achievement: "🏆",
  suggestion_published: "✓",
};

/**
 * Single notification row — used in the /notifications page and in the
 * showcase. Pure visual; the link wrapping + markRead handler is owned by
 * the consumer.
 */
export function NotificationCard({
  type,
  content,
  date,
  unread = false,
  imageUrl,
  fallbackEmoji,
}: NotificationCardProps) {
  const fallback = fallbackEmoji ?? FALLBACK_BY_TYPE[type];

  return (
    <div
      className={`flex items-start gap-3 px-5 py-3 ${
        unread ? "bg-coral-50/30" : ""
      }`}
    >
      <Thumb imageUrl={imageUrl} fallback={fallback} />
      <div className="flex-1 min-w-0">
        <p className="text-base text-zinc-900 leading-snug">{content}</p>
        <p className="text-xs text-zinc-400 mt-1">{date}</p>
      </div>
      {unread && (
        <span
          className="w-2 h-2 rounded-full bg-coral-600 mt-2 shrink-0"
          aria-label="μη αναγνωσμένο"
        />
      )}
    </div>
  );
}

function Thumb({ imageUrl, fallback }: { imageUrl?: string | null; fallback: string }) {
  if (imageUrl) {
    return (
      <div className="w-11 h-11 rounded overflow-hidden shrink-0 bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-11 h-11 rounded shrink-0 bg-zinc-100 flex items-center justify-center text-xl">
      {fallback}
    </div>
  );
}
