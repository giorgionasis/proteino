import Link from "next/link";

const CATEGORIES = [
  { label: "Φαγητό", href: "/food" },
  { label: "Ταινίες", href: "/movies" },
  { label: "Σειρές", href: "/series" },
  { label: "Διαμονή", href: "/hotels" },
  { label: "Συνταγές", href: "/recipes" },
  { label: "Θέατρο", href: "/theater" },
  { label: "Βιβλίο", href: "/books" },
  { label: "Εκδηλώσεις", href: "/events" },
  { label: "Μπαρ", href: "/bars" },
];

const SUPPORT = [
  { label: "Κέντρο Βοήθειας",              href: "/help" },
  { label: "Επικοινωνία",                   href: "/support" },
  { label: "Πως μπορώ να προτείνω",        href: "/help" },
  { label: "Εξατομικευμένη Εμπειρία",      href: "/help" },
  { label: "Πως υπολογίζονται οι πόντοι μου", href: "/help" },
  { label: "Leaderboard",                   href: "/leaderboard" },
  { label: "FAQ",                           href: "/help" },
];

export function FooterMobile() {
  return (
    <footer className="bg-zinc-50 px-5 py-8 space-y-8">
      {/* Brand */}
      <div>
        <Link href="/" className="inline-flex items-baseline gap-[2px]">
          <span className="text-base font-bold text-zinc-800">Proteino</span>
          <span className="w-[4px] h-[4px] rounded-full bg-coral-600 mb-[2px]" />
        </Link>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* Categories */}
      <div className="space-y-4">
        <p className="text-[18px] font-bold text-zinc-800">Κατηγορίες</p>
        <div className="grid grid-cols-2 gap-x-[100px] gap-y-1">
          {CATEGORIES.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="text-[18px] text-zinc-700 leading-[17px] py-1.5 active:text-zinc-500 transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* Support */}
      <div className="space-y-4">
        <p className="text-[18px] font-bold text-zinc-800">Υποστήριξη</p>
        <div className="space-y-1">
          {SUPPORT.map((s) => (
            <Link
              key={s.label}
              href={s.href}
              className="block text-[18px] text-zinc-700 leading-[17px] py-1.5 active:text-zinc-500 transition-colors"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="h-px bg-zinc-200" />

      {/* Legal */}
      <div className="flex items-center gap-4">
        <Link href="/support" className="text-[18px] text-zinc-700 active:text-zinc-500">
          Όροι χρήσης
        </Link>
        <Link href="/support" className="text-[18px] text-zinc-700 active:text-zinc-500">
          Πολιτική Απορρήτου
        </Link>
      </div>

      {/* Copyright */}
      <div className="flex items-center gap-2">
        <span className="text-base text-zinc-600">© 2024</span>
        <span className="text-base font-bold text-zinc-800">Proteino.</span>
      </div>
    </footer>
  );
}
