interface BookmarkIconProps {
  /** When true, render the filled "bookmarked" state. Default = unfilled with + sign. */
  filled?: boolean;
  /** Pixel size (icon is square). */
  size?: number;
  /** Stroke colour — defaults to current text color. */
  className?: string;
}

/**
 * Bookmark icon — outlined ribbon shape with a + plus sign in the middle for
 * the unbookmarked / "add to bookmarks" state. Filled (no +) when bookmarked.
 *
 * Used in the detail-page header bookmark button.
 */
export function BookmarkIcon({ filled = false, size = 22, className = "" }: BookmarkIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 26"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {/* Bookmark ribbon */}
      <path d="M5 3.5 a2.5 2.5 0 0 1 2.5 -2.5 h9 a2.5 2.5 0 0 1 2.5 2.5 v20 l -7 -3.5 l -7 3.5 z" />
      {!filled && (
        <>
          {/* Plus sign in the middle */}
          <line x1="12" y1="8" x2="12" y2="14" />
          <line x1="9" y1="11" x2="15" y2="11" />
        </>
      )}
    </svg>
  );
}
