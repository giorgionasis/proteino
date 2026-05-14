import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAppSettings } from "@/lib/app-settings";

// Gemini Flash-Lite pricing (USD per 1M tokens) — same as /admin/ai-usage
const PRICE_INPUT_PER_M = 0.04;
const PRICE_OUTPUT_PER_M = 0.16;

const DAY_MS = 24 * 60 * 60 * 1000;

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const sb = createAdminClient();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();

  // All counts in parallel. Each query failing in isolation doesn't break the page.
  const [
    pendingReportsRes,
    oldestReportRes,
    unpubRes,
    unpubWeekRes,
    nullSubcatRes,
    missingCoverRes,
    newItemsRes,
    newReviewsRes,
    newUsersRes,
    aiUsageRes,
    appSettings,
  ] = await Promise.all([
    sb.from("content_reports").select("id", { count: "exact", head: true }).eq("resolved", false),
    sb.from("content_reports")
      .select("created_at")
      .eq("resolved", false)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    sb.from("suggestions").select("id", { count: "exact", head: true }).eq("is_published", false),
    sb
      .from("suggestions")
      .select("id", { count: "exact", head: true })
      .eq("is_published", false)
      .gte("created_at", sevenDaysAgo),
    sb.from("items").select("id", { count: "exact", head: true }).is("subcategory_id", null),
    sb.from("items").select("id", { count: "exact", head: true }).is("cover_url", null),
    sb.from("items").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    sb.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    sb.from("users").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    // ai_usage_log might not exist (migration 019 not applied) — code below handles null.
    sb.from("ai_usage_log").select("input_tokens, output_tokens").gte("created_at", sevenDaysAgo),
    fetchAppSettings(sb),
  ]);

  const pendingReports = pendingReportsRes.count ?? 0;
  const oldestReportCreatedAt = (oldestReportRes.data as { created_at: string } | null)?.created_at;
  const oldestReportDays = oldestReportCreatedAt
    ? Math.floor((now - new Date(oldestReportCreatedAt).getTime()) / DAY_MS)
    : null;

  const unpublished = unpubRes.count ?? 0;
  const unpublishedThisWeek = unpubWeekRes.count ?? 0;

  const nullSubcat = nullSubcatRes.count ?? 0;
  const missingCover = missingCoverRes.count ?? 0;
  const dataQuality = nullSubcat + missingCover;

  const newItems = newItemsRes.count ?? 0;
  const newReviews = newReviewsRes.count ?? 0;
  const newUsers = newUsersRes.count ?? 0;

  let aiCostUsd = 0;
  const aiRows = (aiUsageRes.data as { input_tokens: number | null; output_tokens: number | null }[] | null) ?? [];
  for (const r of aiRows) {
    aiCostUsd +=
      ((r.input_tokens ?? 0) * PRICE_INPUT_PER_M) / 1_000_000 +
      ((r.output_tokens ?? 0) * PRICE_OUTPUT_PER_M) / 1_000_000;
  }
  const aiCostLabel = aiCostUsd === 0 ? "$0.00" : aiCostUsd < 0.01 ? "<$0.01" : `$${aiCostUsd.toFixed(2)}`;

  // Friendly date — "Tuesday, May 14"
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-[24px] font-semibold text-zinc-950 leading-tight">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">{today}</p>
      </header>

      {/* Row 1 — Needs your attention */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3">
          Needs your attention
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <AttentionCard
            href="/admin/reports"
            label="Reports pending"
            count={pendingReports}
            tone={pendingReports > 0 ? "red" : "clear"}
            context={
              pendingReports === 0
                ? "All clear"
                : oldestReportDays === null
                  ? "needs review"
                  : oldestReportDays === 0
                    ? "oldest: today"
                    : `oldest: ${oldestReportDays}d ago`
            }
          />
          <AttentionCard
            href="/admin/suggestions"
            label="Unpublished"
            count={unpublished}
            tone={unpublished > 0 ? "red" : "clear"}
            context={
              unpublished === 0
                ? "All published"
                : unpublishedThisWeek === unpublished
                  ? "all from this week"
                  : `${unpublishedThisWeek} this week`
            }
          />
          <AttentionCard
            href="/admin/data-quality"
            label="Data quality"
            count={dataQuality}
            tone={dataQuality > 0 ? "amber" : "clear"}
            context={
              dataQuality === 0
                ? "Looking good"
                : `${nullSubcat} no subcategory · ${missingCover} no cover`
            }
          />
          <MaintenanceCard
            on={appSettings.maintenance_mode}
            message={appSettings.maintenance_message}
          />
        </div>
      </section>

      {/* Row 2 — Last 7 days */}
      <section className="mb-10">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3">
          Last 7 days
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="New items" value={formatNumber(newItems)} />
          <Metric label="New reviews" value={formatNumber(newReviews)} />
          <Metric label="New users" value={formatNumber(newUsers)} />
          <Metric label="AI spend" value={aiCostLabel} href="/admin/ai-usage" />
        </div>
      </section>

      {/* Row 3 — Quick actions */}
      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-500 mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-2.5">
          <QuickAction href="/admin/suggestions/new" label="New suggestion" icon={<IconDiamond />} />
          <QuickAction href="/admin/content/collections/new" label="New collection" icon={<IconCollection />} />
          <QuickAction href="/admin/content/activities/new" label="New activity" icon={<IconPin />} />
          <QuickAction href="/preview/home" label="Preview homepage" icon={<IconExternal />} external />
        </div>
      </section>
    </div>
  );
}

/* ── Card components ────────────────────────────────────── */

function AttentionCard({
  href,
  label,
  count,
  tone,
  context,
}: {
  href: string;
  label: string;
  count: number;
  tone: "red" | "amber" | "clear";
  context: string;
}) {
  const isClear = tone === "clear";
  const numColor =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-zinc-300";
  const dotColor =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <Link
      href={href}
      className="group relative rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
      </div>
      <div className={`text-[34px] font-bold leading-none mb-2 ${numColor}`}>
        {isClear ? "✓" : count}
      </div>
      <p className="text-xs text-zinc-500">{context}</p>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-500 transition-colors"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </Link>
  );
}

function MaintenanceCard({ on, message }: { on: boolean; message: string }) {
  return (
    <Link
      href="/admin/settings"
      className={`group relative rounded-xl border p-4 hover:shadow-sm transition-all ${
        on ? "border-red-200 bg-red-50 hover:border-red-300" : "border-zinc-200 bg-white hover:border-zinc-300"
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${on ? "bg-red-500" : "bg-emerald-500"}`} aria-hidden />
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${on ? "text-red-600" : "text-zinc-500"}`}>
          Maintenance mode
        </span>
      </div>
      <div className={`text-[24px] font-bold leading-none mb-2 ${on ? "text-red-600" : "text-emerald-600"}`}>
        {on ? "ON" : "OFF"}
      </div>
      <p className="text-xs text-zinc-500 line-clamp-2">
        {on ? message || "Site shows a maintenance banner." : "Site is live."}
      </p>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-4 right-4 text-zinc-300 group-hover:text-zinc-500 transition-colors"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </Link>
  );
}

function Metric({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">{label}</p>
      <p className="text-[22px] font-bold text-zinc-900 leading-none">{value}</p>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm transition-all"
      >
        {inner}
      </Link>
    );
  }
  return <div className="rounded-xl border border-zinc-200 bg-white p-4">{inner}</div>;
}

function QuickAction({
  href,
  label,
  icon,
  external,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex items-center gap-2 px-4 h-10 rounded-full border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {icon}
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}

/* ── helpers ────────────────────────────────────────────── */

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/* ── icons ──────────────────────────────────────────────── */

function IconDiamond() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2l10 10-10 10L2 12z" />
    </svg>
  );
}
function IconCollection() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconExternal() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
