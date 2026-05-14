import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/admin/search?q=...
 *
 * Single endpoint that searches across all admin-relevant entities in
 * parallel. Powers the Cmd+K command palette. Returns up to 5 hits per
 * type so the user sees a wide spread, not 50 of one thing.
 *
 * Each result is shaped uniformly:
 *   { id, type, title, subtitle, href, badge? }
 * so the palette can render any list without per-type templates.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ groups: [] });

  const sb = createAdminClient();
  const like = `%${q}%`;

  const [suggestionsRes, usersRes, collectionsRes, activitiesRes, reviewsRes] = await Promise.all([
    // Suggestions — joined to items + author
    sb.from("suggestions")
      .select("id, is_published, items!inner(title, slug, category, cover_url), users!suggestions_user_id_fkey(display_name)")
      .ilike("items.title", like)
      .limit(5),

    // Users
    sb.from("users")
      .select("id, display_name, email, handle, avatar_url, level, suggestion_count")
      .or(`display_name.ilike.${like},email.ilike.${like},handle.ilike.${like}`)
      .limit(5),

    // Collections — by title or alias
    sb.from("collections")
      .select("id, title, title_specific, alias, image_url, source_category, is_published, type")
      .or(`title.ilike.${like},alias.ilike.${like}`)
      .limit(5),

    // Activities
    sb.from("activities")
      .select("id, name, address, image_url, is_published, activity_types(name, activity_categories(name))")
      .ilike("name", like)
      .limit(5),

    // Reviews (comments) — search body
    sb.from("comments")
      .select("id, body, is_hidden, report_count, users!comments_user_id_fkey(display_name)")
      .ilike("body", like)
      .limit(5),
  ]);

  const groups: { type: string; label: string; items: any[] }[] = [];

  // ── Suggestions ───────────────────────────────────────────
  const suggestions = (suggestionsRes.data ?? []).map((r: any) => {
    const item = Array.isArray(r.items) ? r.items[0] : r.items;
    const user = Array.isArray(r.users) ? r.users[0] : r.users;
    return {
      id: r.id,
      type: "suggestion",
      title: item?.title ?? "—",
      subtitle: `${user?.display_name ?? "—"} · ${item?.category ?? "—"}`,
      href: `/admin/suggestions/${r.id}`,
      thumb: item?.cover_url ?? null,
      badge: r.is_published ? null : "DRAFT",
      category: item?.category,
    };
  });
  if (suggestions.length) groups.push({ type: "suggestion", label: "Suggestions", items: suggestions });

  // ── Users ─────────────────────────────────────────────────
  const users = (usersRes.data ?? []).map((u: any) => ({
    id: u.id,
    type: "user",
    title: u.display_name ?? u.handle ?? u.email,
    subtitle: `@${u.handle ?? "—"} · ${u.suggestion_count ?? 0} suggestions · L${u.level ?? 0}`,
    href: `/admin/users?id=${u.id}`,
    thumb: u.avatar_url,
  }));
  if (users.length) groups.push({ type: "user", label: "Users", items: users });

  // ── Collections ───────────────────────────────────────────
  const collections = (collectionsRes.data ?? []).map((c: any) => ({
    id: c.id,
    type: "collection",
    title: [c.title, c.title_specific].filter(Boolean).join(" "),
    subtitle: `${c.type} · ${c.source_category ?? "all"}${c.alias ? ` · ${c.alias}` : ""}`,
    href: `/admin/content/collections/${c.id}`,
    thumb: c.image_url,
    badge: c.is_published ? null : "HIDDEN",
  }));
  if (collections.length) groups.push({ type: "collection", label: "Collections", items: collections });

  // ── Activities ────────────────────────────────────────────
  const activities = (activitiesRes.data ?? []).map((a: any) => {
    const tp = Array.isArray(a.activity_types) ? a.activity_types[0] : a.activity_types;
    const cat = tp?.activity_categories
      ? (Array.isArray(tp.activity_categories) ? tp.activity_categories[0] : tp.activity_categories)
      : null;
    return {
      id: a.id,
      type: "activity",
      title: a.name,
      subtitle: `${tp?.name ?? "—"} · ${cat?.name ?? "—"}${a.address ? ` · ${a.address.split(",")[0]}` : ""}`,
      href: `/admin/content/activities/${a.id}`,
      thumb: a.image_url,
      badge: a.is_published ? null : "HIDDEN",
    };
  });
  if (activities.length) groups.push({ type: "activity", label: "Activities", items: activities });

  // ── Reviews ───────────────────────────────────────────────
  const reviews = (reviewsRes.data ?? []).map((c: any) => {
    const u = Array.isArray(c.users) ? c.users[0] : c.users;
    return {
      id: c.id,
      type: "review",
      title: c.body.slice(0, 80) + (c.body.length > 80 ? "…" : ""),
      subtitle: `${u?.display_name ?? "—"}${c.report_count > 0 ? ` · ${c.report_count} reports` : ""}`,
      href: `/admin/legacy-comments/${c.id}`,
      thumb: null,
      badge: c.is_hidden ? "HIDDEN" : c.report_count > 0 ? "REPORTED" : null,
    };
  });
  if (reviews.length) groups.push({ type: "review", label: "Reviews", items: reviews });

  return NextResponse.json({ groups });
}
