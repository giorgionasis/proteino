import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const PER_TABLE_LIMIT = 6;
const TOTAL_LIMIT = 8;

interface AuditEntry {
  kind: "moment" | "page_section" | "collection" | "related_section" | "category_filter";
  id: string;
  label: string;
  modified_at: string;
  modified_by_id: string | null;
  modified_by: { handle: string; display_name: string } | null;
  href: string;
}

const KIND_META: Record<AuditEntry["kind"], { label: string; color: string }> = {
  moment:          { label: "Moment",          color: "#7c3aed" },
  page_section:    { label: "Layout",          color: "#3b82f6" },
  collection:      { label: "Collection",      color: "#10b981" },
  related_section: { label: "Related rule",    color: "#f59e0b" },
  category_filter: { label: "Filter",          color: "#71717a" },
};

async function fetchPerTable<T extends Record<string, any>>(
  sb: ReturnType<typeof createAdminClient>,
  table: string,
  selectCols: string,
): Promise<T[]> {
  const { data, error } = await (sb.from(table) as any)
    .select(selectCols)
    .not("modified_at", "is", null)
    .order("modified_at", { ascending: false })
    .limit(PER_TABLE_LIMIT);
  if (error) {
    // 42703 = column doesn't exist (migration 040 not applied yet).
    if (error.code === "42703") return [];
    return [];
  }
  return (data ?? []) as T[];
}

/**
 * Recent admin changes widget — reads modified_at + modified_by stamps
 * from the 5 admin-managed tables (migration 040). Renders silently as
 * empty when the migration isn't applied yet.
 */
export async function RecentChanges() {
  const sb = createAdminClient();

  const [moments, pageSections, collections, related, filters] = await Promise.all([
    fetchPerTable<{ id: string; name: string; modified_at: string; modified_by: string | null }>(
      sb, "moments", "id, name, modified_at, modified_by",
    ),
    fetchPerTable<{
      id: string; widget_key: string | null; section_type: string; context: string;
      category: string | null; modified_at: string; modified_by: string | null;
    }>(sb, "page_sections", "id, widget_key, section_type, context, category, modified_at, modified_by"),
    fetchPerTable<{ id: string; name: string; modified_at: string; modified_by: string | null }>(
      sb, "collections", "id, name, modified_at, modified_by",
    ),
    fetchPerTable<{ id: string; category: string; field: string; modified_at: string; modified_by: string | null }>(
      sb, "related_sections_config", "id, category, field, modified_at, modified_by",
    ),
    fetchPerTable<{ id: string; category: string; field_label: string | null; modified_at: string; modified_by: string | null }>(
      sb, "category_filters", "id, category, field_label, modified_at, modified_by",
    ),
  ]);

  const entries: AuditEntry[] = [
    ...moments.map((m): AuditEntry => ({
      kind: "moment", id: m.id, label: m.name,
      modified_at: m.modified_at, modified_by_id: m.modified_by, modified_by: null,
      href: "/admin/moments",
    })),
    ...pageSections.map((s): AuditEntry => ({
      kind: "page_section", id: s.id,
      label: `${s.context}${s.category ? `/${s.category}` : ""} · ${s.widget_key ?? s.section_type}`,
      modified_at: s.modified_at, modified_by_id: s.modified_by, modified_by: null,
      href: "/admin/layout",
    })),
    ...collections.map((c): AuditEntry => ({
      kind: "collection", id: c.id, label: c.name,
      modified_at: c.modified_at, modified_by_id: c.modified_by, modified_by: null,
      href: `/admin/content/collections/${c.id}`,
    })),
    ...related.map((r): AuditEntry => ({
      kind: "related_section", id: r.id, label: `${r.category} · ${r.field}`,
      modified_at: r.modified_at, modified_by_id: r.modified_by, modified_by: null,
      href: "/admin/related-sections",
    })),
    ...filters.map((f): AuditEntry => ({
      kind: "category_filter", id: f.id, label: `${f.category} · ${f.field_label ?? "—"}`,
      modified_at: f.modified_at, modified_by_id: f.modified_by, modified_by: null,
      href: "/admin/content/filters",
    })),
  ];

  entries.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  const sliced = entries.slice(0, TOTAL_LIMIT);

  if (sliced.length === 0) return null;

  // Batched user-name lookup.
  const userIds = Array.from(
    new Set(sliced.map((e) => e.modified_by_id).filter((v): v is string => !!v)),
  );
  if (userIds.length > 0) {
    const { data: users } = await sb
      .from("users")
      .select("id, handle, display_name")
      .in("id", userIds);
    const byId = new Map(
      ((users ?? []) as Array<{ id: string; handle: string; display_name: string }>).map(
        (u) => [u.id, { handle: u.handle, display_name: u.display_name }] as const,
      ),
    );
    for (const e of sliced) {
      if (e.modified_by_id && byId.has(e.modified_by_id)) {
        e.modified_by = byId.get(e.modified_by_id) ?? null;
      }
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/70 backdrop-blur-sm overflow-hidden">
      <ul className="divide-y divide-zinc-100">
        {sliced.map((e) => {
          const meta = KIND_META[e.kind];
          return (
            <li key={`${e.kind}-${e.id}`} className="hover:bg-zinc-50/60 transition-colors">
              <Link href={e.href} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.06em] text-white shrink-0"
                  style={{ background: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="text-sm text-zinc-800 font-medium truncate min-w-0 flex-1">
                  {e.label}
                </span>
                <span className="text-xs text-zinc-500 shrink-0">
                  {e.modified_by ? `@${e.modified_by.handle}` : "—"}
                </span>
                <span className="text-xs text-zinc-400 shrink-0 tabular-nums" style={{ fontFeatureSettings: '"tnum"' }}>
                  {relativeTime(e.modified_at)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
