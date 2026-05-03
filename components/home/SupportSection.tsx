import Link from "next/link";

const ITEMS = [
  { label: "Κέντρο βοήθειας", href: "/support" },
  { label: "Επικοινωνία",     href: "/support" },
  { label: "Chat",             href: "/support" },
];

export function SupportSection() {
  return (
    <section className="px-6 py-10 space-y-6" style={{ borderTop: "1px solid #E4E4E7" }}>
      {/* Hero text */}
      <div className="flex items-center justify-between">
        <p className="text-[24px] leading-[110%]">
          <span className="font-semibold text-zinc-800">Είμαστε εδώ για </span>
          <span className="font-extrabold text-zinc-950">εσένα</span>
        </p>
        <svg width="56" height="56" viewBox="0 0 130 130" fill="none" aria-hidden>
          <circle cx="65" cy="65" r="50" fill="#FFF5EC" />
          <circle cx="65" cy="52" r="18" fill="none" stroke="#FE6F5E" strokeWidth="3"/>
          <rect x="42" y="62" width="10" height="16" rx="5" fill="#FE6F5E" opacity="0.3"/>
          <rect x="78" y="62" width="10" height="16" rx="5" fill="#FE6F5E" opacity="0.3"/>
          <path d="M47 65 Q47 85 65 87 Q83 85 83 65" stroke="#FE6F5E" strokeWidth="3" fill="none"/>
          <rect x="52" y="90" width="26" height="14" rx="7" fill="#FE6F5E" opacity="0.15"/>
          <path d="M60 45c0-3 3-5 5-5s5 2 5 5" stroke="#FE6F5E" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </svg>
      </div>

      {/* Support links */}
      <div className="space-y-3">
        {ITEMS.map(item => (
          <Link key={item.label} href={item.href}
            className="flex items-center justify-between py-4 px-5 rounded-[12px] active:bg-zinc-50 transition-colors"
            style={{ border: "1px solid #D4D4D8" }}>
            <span className="text-[16px] font-semibold text-zinc-800">{item.label}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#71717A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
