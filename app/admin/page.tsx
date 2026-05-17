import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchAppSettings } from "@/lib/app-settings";

// Gemini Flash-Lite pricing (USD per 1M tokens) — same as /admin/ai-usage
const PRICE_INPUT_PER_M = 0.04;
const PRICE_OUTPUT_PER_M = 0.16;

const DAY_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_DAYS = 14;

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const sb = createAdminClient();
  const sbAuth = await createClient();
  const now = Date.now();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
  const fourteenDaysAgo = new Date(now - SPARKLINE_DAYS * DAY_MS).toISOString();

  // Fetch the admin's display_name for the greeting. Auth client — admin
  // client (service role) doesn't carry a session.
  const { data: { user } } = await sbAuth.auth.getUser();
  let firstName = "Admin";
  if (user?.id) {
    const { data: profile } = await sb
      .from("users")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const dn = (profile as { display_name?: string } | null)?.display_name;
    if (dn) firstName = dn.split(/\s+/)[0];
  }

  // All counts + 14-day timestamp lists in parallel. Each query failing in
  // isolation doesn't break the page.
  const [
    pendingReportsRes,
    oldestReportRes,
    unpubRes,
    unpubWeekRes,
    nullSubcatRes,
    missingCoverRes,
    reports14Res,
    suggestions14Res,
    items14Res,
    reviews14Res,
    users14Res,
    aiUsage14Res,
    appSettings,
  ] = await Promise.all([
    sb.from("content_reports").select("id", { count: "exact", head: true }).eq("resolved", false),
    sb
      .from("content_reports")
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
    // Sparkline raw data — last 14 days of `created_at` per surface.
    sb.from("content_reports").select("created_at").gte("created_at", fourteenDaysAgo).limit(5000),
    sb
      .from("suggestions")
      .select("created_at")
      .eq("is_published", false)
      .gte("created_at", fourteenDaysAgo)
      .limit(5000),
    sb.from("items").select("created_at").gte("created_at", fourteenDaysAgo).limit(5000),
    sb.from("reviews").select("created_at").gte("created_at", fourteenDaysAgo).limit(5000),
    sb.from("users").select("created_at").gte("created_at", fourteenDaysAgo).limit(5000),
    sb
      .from("ai_usage_log")
      .select("created_at, input_tokens, output_tokens")
      .gte("created_at", fourteenDaysAgo)
      .limit(10000),
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

  // Build sparkline buckets — last 14 days, oldest → newest.
  const reportSpark = bucketDaily(timestamps(reports14Res.data), SPARKLINE_DAYS, now);
  const unpubSpark = bucketDaily(timestamps(suggestions14Res.data), SPARKLINE_DAYS, now);
  const itemsSpark = bucketDaily(timestamps(items14Res.data), SPARKLINE_DAYS, now);
  const reviewsSpark = bucketDaily(timestamps(reviews14Res.data), SPARKLINE_DAYS, now);
  const usersSpark = bucketDaily(timestamps(users14Res.data), SPARKLINE_DAYS, now);

  const aiRows =
    (aiUsage14Res.data as
      | { created_at: string; input_tokens: number | null; output_tokens: number | null }[]
      | null) ?? [];
  const aiCostSpark = bucketAICostDaily(aiRows, SPARKLINE_DAYS, now);
  // Last-7-days totals derived from the sparkline tail (avoids a second query).
  const newItems = sumLast(itemsSpark, 7);
  const newReviews = sumLast(reviewsSpark, 7);
  const newUsers = sumLast(usersSpark, 7);
  const aiCostUsd = aiCostSpark.slice(-7).reduce((a, b) => a + b, 0);
  const aiCostLabel = aiCostUsd === 0 ? "$0.00" : aiCostUsd < 0.01 ? "<$0.01" : `$${aiCostUsd.toFixed(2)}`;

  const greeting = greetingForHour(new Date().getHours());
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className="relative -mx-8 -my-8 px-8 py-8 min-h-[calc(100vh-0px)]"
      style={{
        background:
          "radial-gradient(ellipse 800px 500px at 100% 0%, rgba(254, 111, 94, 0.06), transparent 60%)",
      }}
    >
      <div className="max-w-5xl">
        {/* Greeting */}
        <header className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h1 className="text-[28px] font-semibold text-zinc-950 leading-tight tracking-tight">
            {greeting}, <span className="text-coral-600">{firstName}</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1.5">{today}</p>
        </header>

        {/* Row 1 — Needs your attention */}
        <section className="mb-10">
          <SectionHeading>Needs your attention</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AttentionCard
              index={0}
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
              sparkline={reportSpark}
              sparklineColor="#ef4444"
            />
            <AttentionCard
              index={1}
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
              sparkline={unpubSpark}
              sparklineColor="#ef4444"
            />
            <AttentionCard
              index={2}
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
              index={3}
              on={appSettings.maintenance_mode}
              message={appSettings.maintenance_message}
            />
          </div>
        </section>

        {/* Row 2 — Last 7 days */}
        <section className="mb-10">
          <SectionHeading>Last 7 days</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              index={4}
              label="New items"
              value={formatNumber(newItems)}
              sparkline={itemsSpark}
              sparklineColor="#3b82f6"
            />
            <MetricCard
              index={5}
              label="New reviews"
              value={formatNumber(newReviews)}
              sparkline={reviewsSpark}
              sparklineColor="#10b981"
            />
            <MetricCard
              index={6}
              label="New users"
              value={formatNumber(newUsers)}
              sparkline={usersSpark}
              sparklineColor="#8b5cf6"
            />
            <MetricCard
              index={7}
              label="AI spend"
              value={aiCostLabel}
              href="/admin/ai-usage"
              sparkline={aiCostSpark}
              sparklineColor="#FE6F5E"
            />
          </div>
        </section>

        {/* Row 3 — Quick actions */}
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500" style={{ animationDelay: "480ms", animationFillMode: "backwards" }}>
          <SectionHeading>Quick actions</SectionHeading>
          <div className="flex flex-wrap gap-2.5">
            <QuickAction href="/admin/suggestions/new" label="New suggestion" icon={<IconDiamond />} />
            <QuickAction href="/admin/content/collections/new" label="New collection" icon={<IconCollection />} />
            <QuickAction href="/admin/content/activities/new" label="New activity" icon={<IconPin />} />
            <QuickAction href="/preview/home" label="Preview homepage" icon={<IconExternal />} external />
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Card components ────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-zinc-500 mb-3">
      {children}
    </h2>
  );
}

function staggerStyle(index: number): React.CSSProperties {
  return {
    animationDelay: `${index * 60}ms`,
    animationFillMode: "backwards",
  };
}

function AttentionCard({
  index,
  href,
  label,
  count,
  tone,
  context,
  sparkline,
  sparklineColor,
}: {
  index: number;
  href: string;
  label: string;
  count: number;
  tone: "red" | "amber" | "clear";
  context: string;
  sparkline?: number[];
  sparklineColor?: string;
}) {
  const isClear = tone === "clear";
  const numColor =
    tone === "red"
      ? "text-red-600"
      : tone === "amber"
        ? "text-amber-600"
        : "text-zinc-300";
  const dot =
    tone === "red"
      ? "bg-red-500"
      : tone === "amber"
        ? "bg-amber-500"
        : "bg-emerald-400";

  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-5 hover:border-zinc-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden"
      style={staggerStyle(index)}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-hidden />
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
          {label}
        </span>
      </div>
      <div
        className={`text-[36px] font-bold leading-none mb-2 tabular-nums ${numColor}`}
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {isClear ? <span className="text-emerald-500 text-[28px]">✓</span> : count}
      </div>
      <p className="text-xs text-zinc-500">{context}</p>

      {sparkline && sparkline.some((v) => v > 0) && (
        <div className="mt-3 -mx-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <Sparkline data={sparkline} color={sparklineColor ?? "#71717a"} height={24} />
        </div>
      )}

      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute top-5 right-5 text-zinc-300 group-hover:text-zinc-600 transition-colors"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </Link>
  );
}

function MaintenanceCard({
  index,
  on,
  message,
}: {
  index: number;
  on: boolean;
  message: string;
}) {
  return (
    <Link
      href="/admin/settings"
      className={`group relative rounded-2xl border p-5 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-500 ${
        on
          ? "border-red-200 bg-gradient-to-br from-red-50 to-red-50/40 hover:border-red-300"
          : "border-zinc-200/80 bg-white/70 backdrop-blur-sm hover:border-zinc-300"
      }`}
      style={staggerStyle(index)}
    >
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`w-1.5 h-1.5 rounded-full ${on ? "bg-red-500 animate-pulse" : "bg-emerald-400"}`}
          aria-hidden
        />
        <span
          className={`text-[10.5px] font-semibold uppercase tracking-[0.06em] ${
            on ? "text-red-700" : "text-zinc-500"
          }`}
        >
          Maintenance mode
        </span>
      </div>
      <div className={`text-[28px] font-bold leading-none mb-2 ${on ? "text-red-600" : "text-emerald-600"}`}>
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
        className="absolute top-5 right-5 text-zinc-300 group-hover:text-zinc-600 transition-colors"
      >
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </Link>
  );
}

function MetricCard({
  index,
  label,
  value,
  href,
  sparkline,
  sparklineColor,
}: {
  index: number;
  label: string;
  value: string;
  href?: string;
  sparkline?: number[];
  sparklineColor?: string;
}) {
  const inner = (
    <>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-zinc-500 mb-2">
        {label}
      </p>
      <p
        className="text-[24px] font-bold text-zinc-900 leading-none tabular-nums"
        style={{ fontFeatureSettings: '"tnum"' }}
      >
        {value}
      </p>
      {sparkline && sparkline.some((v) => v > 0) && (
        <div className="mt-3 -mx-1 opacity-70 group-hover:opacity-100 transition-opacity">
          <Sparkline data={sparkline} color={sparklineColor ?? "#71717a"} height={22} />
        </div>
      )}
    </>
  );
  const className =
    "group rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm p-5 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-500";
  if (href) {
    return (
      <Link
        href={href}
        className={`${className} hover:border-zinc-300 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-[1px]`}
        style={staggerStyle(index)}
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className={className} style={staggerStyle(index)}>
      {inner}
    </div>
  );
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
    "inline-flex items-center gap-2 px-4 h-10 rounded-full border border-zinc-200/80 bg-white/70 backdrop-blur-sm text-sm font-medium text-zinc-700 hover:bg-white hover:border-zinc-300 hover:shadow-sm transition-all";
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

/* ── Sparkline component (inline SVG, no dependency) ────── */

function Sparkline({
  data,
  color = "#71717a",
  height = 28,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length === 0) return <div style={{ height }} />;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
    const y = height - (v / max) * (height - 2) - 1;
    return [x, y] as const;
  });
  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const areaPath = `${linePath} L100,${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full block"
      style={{ height }}
      aria-hidden
    >
      <path d={areaPath} fill={color} fillOpacity={0.12} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ── helpers ────────────────────────────────────────────── */

function timestamps(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r) => (r as { created_at?: string }).created_at)
    .filter((v): v is string => typeof v === "string");
}

function bucketDaily(ts: string[], days: number, endTime: number): number[] {
  const buckets = new Array(days).fill(0);
  const startTime = endTime - days * DAY_MS;
  for (const t of ts) {
    const ms = new Date(t).getTime();
    if (Number.isNaN(ms) || ms < startTime || ms > endTime) continue;
    const bucket = Math.floor((ms - startTime) / DAY_MS);
    if (bucket >= 0 && bucket < days) buckets[bucket]++;
  }
  return buckets;
}

function bucketAICostDaily(
  rows: { created_at: string; input_tokens: number | null; output_tokens: number | null }[],
  days: number,
  endTime: number
): number[] {
  const buckets = new Array(days).fill(0);
  const startTime = endTime - days * DAY_MS;
  for (const r of rows) {
    const ms = new Date(r.created_at).getTime();
    if (Number.isNaN(ms) || ms < startTime || ms > endTime) continue;
    const bucket = Math.floor((ms - startTime) / DAY_MS);
    if (bucket < 0 || bucket >= days) continue;
    const cost =
      ((r.input_tokens ?? 0) * PRICE_INPUT_PER_M) / 1_000_000 +
      ((r.output_tokens ?? 0) * PRICE_OUTPUT_PER_M) / 1_000_000;
    buckets[bucket] += cost;
  }
  return buckets;
}

function sumLast(arr: number[], n: number): number {
  return arr.slice(-n).reduce((a, b) => a + b, 0);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Working late";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
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
