import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { resolveOneMoment, buildVars } from "@/lib/moments";
import type { ResolvedMoment } from "@/lib/moments";

type BookmarkStatus = "wishlist" | "done";

function isStatus(v: unknown): v is BookmarkStatus {
  return v === "wishlist" || v === "done";
}

/**
 * The `bookmarks.status` column was introduced in migration 023.
 * If the DB hasn't been migrated yet, every status-aware write/read
 * falls back to a legacy shape so the bookmark flow keeps working.
 * Treat missing-column rows as `wishlist` (the default state).
 */
const MISSING_COLUMN_CODE = "42703";

function bookmarkContextRange(): string {
  return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
}

// POST /api/bookmarks
//   body: { item_id, category, status?: 'wishlist' | 'done' }
// Idempotent: re-bookmarking is a no-op. Returns enriched context
// (categoryCount + todayCount) for the post-save toast.
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { item_id, category, status: requestedStatus } = body as {
    item_id?: string; category?: string; status?: unknown;
  };
  if (!item_id || !category) {
    return NextResponse.json({ error: "item_id and category required" }, { status: 400 });
  }

  const status: BookmarkStatus = isStatus(requestedStatus) ? requestedStatus : "wishlist";

  // Try with `status`. Fall back to the legacy shape if migration 023
  // hasn't been applied yet — the bookmark still saves.
  let writeErr: any = null;
  const withStatus = await (supabase.from("bookmarks") as any).upsert(
    { user_id: user.id, item_id, category, status },
    { onConflict: "user_id,item_id", ignoreDuplicates: true },
  );
  if (withStatus.error?.code === MISSING_COLUMN_CODE) {
    const legacy = await (supabase.from("bookmarks") as any).upsert(
      { user_id: user.id, item_id, category },
      { onConflict: "user_id,item_id", ignoreDuplicates: true },
    );
    writeErr = legacy.error;
  } else {
    writeErr = withStatus.error;
  }

  if (writeErr) {
    console.error("[POST /api/bookmarks] upsert failed", writeErr);
    return NextResponse.json({ error: writeErr.message ?? "Save failed" }, { status: 500 });
  }

  // Read back the row to honour idempotency (existing rows keep their
  // status). Try with status, fall back if column missing.
  let rowStatus: BookmarkStatus = status;
  const rowRes = await supabase
    .from("bookmarks")
    .select("status")
    .eq("user_id", user.id)
    .eq("item_id", item_id)
    .maybeSingle();
  if (rowRes.error?.code !== MISSING_COLUMN_CODE) {
    const data = rowRes.data as { status?: string } | null;
    if (data?.status === "wishlist" || data?.status === "done") {
      rowStatus = data.status;
    }
  }

  // Context for the celebration modal — best-effort. A failure here
  // must NOT crash the save response, so wrap in try/catch.
  //
  // Returns:
  //   categoryCount    — total bookmarks the current user has in
  //                       this category (drives milestone copy)
  //   todayCount       — bookmarks on this item in the last 24h
  //   bookmarkers      — up to 10 OTHER users who bookmarked this
  //                       item, ordered by recency (avatar stack)
  //   bookmarkersTotal — total count of OTHER bookmarkers
  let context: {
    categoryCount:    number;
    todayCount:       number;
    bookmarkers:      Array<{ handle: string; display_name: string | null; avatar_url: string | null }>;
    bookmarkersTotal: number;
  } | null = null;
  try {
    const [categoryCountRow, todayRow, bookmarkersTotalRow, bookmarkersRows] = await Promise.all([
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("category", category),
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("item_id", item_id)
        .gte("created_at", bookmarkContextRange()),
      supabase
        .from("bookmarks")
        .select("id", { count: "exact", head: true })
        .eq("item_id", item_id)
        .neq("user_id", user.id),
      supabase
        .from("bookmarks")
        .select("users(handle, display_name, avatar_url)")
        .eq("item_id", item_id)
        .neq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const bookmarkers = ((bookmarkersRows.data ?? []) as any[])
      .map((row) => row.users)
      .filter((u: any): u is { handle: string; display_name: string | null; avatar_url: string | null } => !!u);
    context = {
      categoryCount:    categoryCountRow.count ?? 0,
      todayCount:       todayRow.count ?? 0,
      bookmarkers,
      bookmarkersTotal: bookmarkersTotalRow.count ?? 0,
    };
  } catch (e) {
    console.warn("[POST /api/bookmarks] context fetch failed", e);
  }

  // Resolve celebration moment from the DB-driven `moments` table.
  // Resolver returns null when no row matches; client renders inline
  // fallback copy in that case so behaviour is unchanged pre-migration.
  let moment: ResolvedMoment | null = null;
  try {
    const { data: userMeta } = await supabase
      .from("users")
      .select("handle, display_name")
      .eq("id", user.id)
      .single();

    moment = await resolveOneMoment(
      "bookmark_created",
      "bookmark_modal",
      {
        user: {
          id:           user.id,
          handle:       (userMeta as any)?.handle ?? null,
          display_name: (userMeta as any)?.display_name ?? null,
        },
        payload: {
          item_id,
          category,
          bookmarkersTotal:       context?.bookmarkersTotal ?? 0,
          category_bookmark_count: context?.categoryCount    ?? 0,
        },
        vars: buildVars({
          user:     { handle: (userMeta as any)?.handle, display_name: (userMeta as any)?.display_name },
          category,
          extra:    {
            bookmarkersTotal: context?.bookmarkersTotal ?? 0,
            category_bookmark_count: context?.categoryCount ?? 0,
          },
        }),
      },
    );
  } catch (e) {
    console.warn("[POST /api/bookmarks] moment resolve failed", e);
  }

  return NextResponse.json({ ok: true, status: rowStatus, context, moment });
}

// PATCH /api/bookmarks  body: { item_id, category?, status }
// Move an existing bookmark between wishlist and done. Materialises
// the row if it doesn't exist (category required in that case).
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { item_id, category, status } = body as {
    item_id?: string; category?: string; status?: unknown;
  };
  if (!item_id || !isStatus(status)) {
    return NextResponse.json({ error: "item_id and valid status required" }, { status: 400 });
  }

  // Try to update the existing row. If the column doesn't exist
  // (migration 023 not applied), we can't change status — return 503
  // with a clear code so the client surfaces the migration message.
  const updateRes = await (supabase.from("bookmarks") as any)
    .update({ status })
    .eq("user_id", user.id)
    .eq("item_id", item_id)
    .select("id")
    .maybeSingle();

  if (updateRes.error?.code === MISSING_COLUMN_CODE) {
    return NextResponse.json(
      { error: "Migration 023 not applied — status column missing", code: "MISSING_STATUS_COLUMN" },
      { status: 503 },
    );
  }
  if (updateRes.error) {
    console.error("[PATCH /api/bookmarks] update failed", updateRes.error);
    return NextResponse.json({ error: updateRes.error.message }, { status: 500 });
  }

  // Row doesn't exist → materialise it. Requires category.
  if (!updateRes.data) {
    if (!category) {
      return NextResponse.json({ error: "category required for new bookmark" }, { status: 400 });
    }
    const insert = await (supabase.from("bookmarks") as any).upsert(
      { user_id: user.id, item_id, category, status },
      { onConflict: "user_id,item_id" },
    );
    if (insert.error) {
      // If status column missing, fall back without it (treat as wishlist).
      if (insert.error.code === MISSING_COLUMN_CODE) {
        const legacy = await (supabase.from("bookmarks") as any).upsert(
          { user_id: user.id, item_id, category },
          { onConflict: "user_id,item_id" },
        );
        if (legacy.error) {
          console.error("[PATCH /api/bookmarks] legacy upsert failed", legacy.error);
          return NextResponse.json({ error: legacy.error.message }, { status: 500 });
        }
        return NextResponse.json(
          { ok: true, status, code: "STATUS_COLUMN_MISSING_FALLBACK" },
        );
      }
      console.error("[PATCH /api/bookmarks] insert failed", insert.error);
      return NextResponse.json({ error: insert.error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, status });
}

// DELETE /api/bookmarks?item_id=...
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const itemId = url.searchParams.get("item_id");
  if (!itemId) return NextResponse.json({ error: "item_id required" }, { status: 400 });

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("item_id", itemId);

  if (error) {
    console.error("[DELETE /api/bookmarks]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// GET /api/bookmarks?item_id=...&item_id=...
//   → { ids, items: [{ item_id, status }] }
// Falls back to the legacy shape (no status) so the page still loads
// before migration 023 is applied. Missing-column rows surface as
// status='wishlist' on the client.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ids: [], items: [] });

  const url = new URL(req.url);
  const ids = url.searchParams.getAll("item_id");

  let rows: any[] = [];
  const withStatus = await (() => {
    let q: any = supabase.from("bookmarks").select("item_id, status").eq("user_id", user.id);
    if (ids.length > 0) q = q.in("item_id", ids);
    return q;
  })();

  if (withStatus.error?.code === MISSING_COLUMN_CODE) {
    let q: any = supabase.from("bookmarks").select("item_id").eq("user_id", user.id);
    if (ids.length > 0) q = q.in("item_id", ids);
    const legacy = await q;
    if (legacy.error) {
      return NextResponse.json({ error: legacy.error.message }, { status: 500 });
    }
    rows = (legacy.data ?? []).map((b: any) => ({ item_id: b.item_id, status: "wishlist" }));
  } else if (withStatus.error) {
    return NextResponse.json({ error: withStatus.error.message }, { status: 500 });
  } else {
    rows = withStatus.data ?? [];
  }

  return NextResponse.json({
    ids:   rows.map((b) => b.item_id),
    items: rows.map((b) => ({ item_id: b.item_id, status: (b.status ?? "wishlist") as BookmarkStatus })),
  });
}
