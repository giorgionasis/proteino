import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/admin/audit-log?limit=10
 *
 * Returns the most recent admin changes across the configuration
 * tables that carry `modified_by` + `modified_at` (migration 040):
 * moments, page_sections, collections, related_sections_config,
 * category_filters.
 *
 * Each entry: { kind, id, label, modified_at, modified_by_id,
 *               modified_by: { handle, display_name } | null }
 *
 * Used by the Overview "recent changes" widget. Defensive against an
 * unapplied migration — per-table queries that error on the missing
 * column (PostgREST code 42703) drop silently.
 */
export const dynamic = "force-dynamic";

interface AuditEntry {
  kind: "moment" | "page_section" | "collection" | "related_section" | "category_filter";
  id: string;
  label: string;
  modified_at: string;
  modified_by_id: string | null;
  modified_by: { handle: string; display_name: string } | null;
}

const PER_TABLE_LIMIT = 8;

export async function GET(req: Request) {
  // Auth gate
  const sbAuth = await createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const admin = createAdminClient();
  const { data: actor } = await admin.from("users").select("role").eq("id", user.id).maybeSingle();
  if ((actor as { role?: string } | null)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get("limit") ?? "10", 10) || 10));

  // Each per-table query is wrapped so a missing-column error (42703)
  // resolves to []. Lets the widget render correctly before migration
  // 040 is applied in production.
  async function fetchPerTable<T extends Record<string, any>>(
    table: string,
    selectCols: string,
  ): Promise<T[]> {
    const { data, error } = await (admin.from(table) as any)
      .select(selectCols)
      .not("modified_at", "is", null)
      .order("modified_at", { ascending: false })
      .limit(PER_TABLE_LIMIT);
    if (error) {
      if (error.code === "42703") return [];
      console.error(`[audit-log] ${table}`, error.message);
      return [];
    }
    return (data ?? []) as T[];
  }

  const [moments, pageSections, collections, related, filters] = await Promise.all([
    fetchPerTable<{ id: string; key: string; label: string | null; modified_at: string; modified_by: string | null }>(
      "moments",
      "id, key, label, modified_at, modified_by",
    ),
    fetchPerTable<{
      id: string; widget_key: string | null; section_type: string; context: string;
      category: string | null; modified_at: string; modified_by: string | null;
    }>(
      "page_sections",
      "id, widget_key, section_type, context, category, modified_at, modified_by",
    ),
    fetchPerTable<{ id: string; title: string; title_specific: string | null; modified_at: string; modified_by: string | null }>(
      "collections",
      "id, title, title_specific, modified_at, modified_by",
    ),
    fetchPerTable<{ id: string; category: string; field: string; modified_at: string; modified_by: string | null }>(
      "related_sections_config",
      "id, category, field, modified_at, modified_by",
    ),
    fetchPerTable<{ id: string; category: string; label: string | null; modified_at: string; modified_by: string | null }>(
      "category_filters",
      "id, category, label, modified_at, modified_by",
    ),
  ]);

  const entries: AuditEntry[] = [
    ...moments.map((m): AuditEntry => ({
      kind: "moment",
      id: m.id,
      label: m.label || m.key,
      modified_at: m.modified_at,
      modified_by_id: m.modified_by,
      modified_by: null,
    })),
    ...pageSections.map((s): AuditEntry => ({
      kind: "page_section",
      id: s.id,
      label: `${s.context}${s.category ? `/${s.category}` : ""} · ${s.widget_key ?? s.section_type}`,
      modified_at: s.modified_at,
      modified_by_id: s.modified_by,
      modified_by: null,
    })),
    ...collections.map((c): AuditEntry => ({
      kind: "collection",
      id: c.id,
      label: c.title_specific ? `${c.title} — ${c.title_specific}` : c.title,
      modified_at: c.modified_at,
      modified_by_id: c.modified_by,
      modified_by: null,
    })),
    ...related.map((r): AuditEntry => ({
      kind: "related_section",
      id: r.id,
      label: `${r.category} · ${r.field}`,
      modified_at: r.modified_at,
      modified_by_id: r.modified_by,
      modified_by: null,
    })),
    ...filters.map((f): AuditEntry => ({
      kind: "category_filter",
      id: f.id,
      label: `${f.category} · ${f.label ?? "—"}`,
      modified_at: f.modified_at,
      modified_by_id: f.modified_by,
      modified_by: null,
    })),
  ];

  entries.sort((a, b) => b.modified_at.localeCompare(a.modified_at));
  const sliced = entries.slice(0, limit);

  // Resolve admin display names in a single batched lookup. Skips when
  // every entry has modified_by_id = null (no work to do).
  const userIds = Array.from(
    new Set(sliced.map((e) => e.modified_by_id).filter((v): v is string => !!v)),
  );
  if (userIds.length > 0) {
    const { data: users } = await admin
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

  return NextResponse.json({ entries: sliced });
}
