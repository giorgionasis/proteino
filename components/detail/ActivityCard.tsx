interface ActivityCardProps {
  title: string;
  /** Subtitle line — typically the venue/place name (e.g. "Καιμάκτσαλαν"). */
  subtitle?: string;
  /** Pre-formatted distance string (e.g. "8.2 χλμ"). */
  distance?: string;
  /** Background image. Falls back to a dark grey block. */
  imageUrl?: string | null;
  /** Click target — website OR Google Maps coords URL. */
  href?: string;
  /** "carousel" → fixed 320×180 size for horizontal scroll. "compact" → 200×133. */
  size?: "carousel" | "compact";
}

/**
 * Single activity card for the "Κοντινές Δραστηριότητες" carousel on hotels.
 *
 * Visual: full-bleed image with dark gradient overlay at the bottom; title +
 * subtitle (left) and distance (right) over the gradient. Arrow chip in the
 * top-right indicates external link.
 */
export function ActivityCard({
  title,
  subtitle,
  distance,
  imageUrl,
  href,
  size = "carousel",
}: ActivityCardProps) {
  const dims =
    size === "carousel"
      ? "w-[320px] h-[180px]"
      : "w-[200px] h-[133px]";

  const content = (
    <div className={`relative ${dims} rounded-[16px] overflow-hidden bg-zinc-700 shrink-0`}>
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      {href && (
        <span
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center"
          aria-hidden
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-700"
          >
            <path d="M7 17l10-10M9 7h8v8" />
          </svg>
        </span>
      )}
      <div className="absolute left-4 right-4 bottom-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white font-bold leading-tight text-[22px] line-clamp-1 drop-shadow-md">
            {title}
          </p>
          {subtitle && (
            <p className="text-white/90 font-medium text-[13px] leading-tight line-clamp-1 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {distance && (
          <span className="text-white font-semibold text-[13px] shrink-0 drop-shadow-md">
            {distance}
          </span>
        )}
      </div>
    </div>
  );

  if (!href) return content;
  const isExternal = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="block active:opacity-90 transition-opacity"
    >
      {content}
    </a>
  );
}
