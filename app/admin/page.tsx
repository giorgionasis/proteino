import Link from "next/link";

export default function AdminOverviewPage() {
  const quickCreate = [
    { label: "Category", href: "/admin/categories/new", icon: "grid" },
    { label: "ExtraField", href: "/admin/extra-fields/new", icon: "diamond" },
    { label: "Collection", href: "/admin/content/collections/new", icon: "collection" },
    { label: "Activity", href: "/admin/content/activities/new", icon: "activity" },
  ];

  const stats = [
    { value: 4, label: "Reviews\nUnresolved", color: "bg-red-500", href: "/admin/reviews" },
    { value: 13, label: "Last Day\nSuggestions", color: "bg-emerald-600", href: "/admin/suggestions" },
    { value: 2, label: "Movies\nTonight", color: "bg-zinc-700", href: "/admin/content/movies-tonight" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-800 mb-8">Home</h1>

      {/* Quick create */}
      <div className="mb-8">
        <p className="text-sm font-medium text-zinc-600 mb-3">Create New:</p>
        <div className="flex gap-3">
          {quickCreate.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 px-5 py-2.5 border border-zinc-200 rounded-full text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <QuickIcon type={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="flex gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex-1 max-w-[220px] border border-zinc-200 rounded-xl p-5 hover:border-zinc-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <span className={`w-8 h-8 rounded-lg ${s.color} text-white text-sm font-bold flex items-center justify-center`}>
                {s.value}
              </span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400" strokeLinecap="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <p className="text-sm font-medium text-zinc-700 whitespace-pre-line">{s.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QuickIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 text-zinc-500";
  switch (type) {
    case "grid":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>;
    case "diamond":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2l10 10-10 10L2 12z" /></svg>;
    case "collection":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;
    case "activity":
      return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>;
    default:
      return null;
  }
}
