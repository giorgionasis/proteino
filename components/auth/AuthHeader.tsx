import Link from "next/link";

interface Props {
  closeHref: string;
  closeLabel?: string;
}

export function AuthHeader({ closeHref, closeLabel = "Κλείσιμο" }: Props) {
  return (
    <div
      className="flex items-center justify-between px-5"
      style={{ height: 56, borderBottom: "1px solid #E4E4E7" }}
    >
      {/* Proteino• logo */}
      <div className="flex items-center" style={{ gap: 1 }}>
        <span
          style={{
            fontFamily: "Avenir, 'Open Sans', sans-serif",
            fontWeight: 900,
            fontSize: 22,
            letterSpacing: "0.04em",
            color: "#3F3F46",
          }}
        >
          Proteino
        </span>
        {/* Coral dot */}
        <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden style={{ marginBottom: 1 }}>
          <circle cx="4" cy="4" r="4" fill="#FE6F5E" />
        </svg>
      </div>

      {/* Close / Back button */}
      <Link
        href={closeHref}
        aria-label={closeLabel}
        className="flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors"
        style={{ width: 48, height: 48 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M2 2L14 14M14 2L2 14" stroke="#52525B" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      </Link>
    </div>
  );
}
