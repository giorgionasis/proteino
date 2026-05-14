import { createAdminClient } from "@/lib/supabase/admin";
import { ReviewEditor } from "@/components/admin/ReviewEditor";
import { notFound } from "next/navigation";

export default async function ReviewDetailPage({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("comments")
    .select(`
      id, body, created_at, user_id, parent_id, suggestion_id,
      vote_up, vote_down, report_count, is_hidden, hidden_reason, hidden_at,
      users!comments_user_id_fkey(id, display_name, handle, email, avatar_url, suggestion_count, is_verified),
      suggestions!inner(
        id, reflection, rating, created_at,
        users!suggestions_user_id_fkey(display_name, handle),
        items!inner(id, title, category, slug, poster_url, backdrop_url)
      )
    `)
    .eq("id", params.id)
    .single();

  if (error || !data) notFound();

  const c = data as any;

  // Reports for this comment
  const { data: reports } = await supabase
    .from("comment_reports")
    .select(`
      id, reason, description, resolved, resolution_action, resolved_at, created_at,
      users!reporter_id(id, display_name, handle)
    `)
    .eq("comment_id", c.id)
    .order("created_at", { ascending: false });

  // Sibling comments on the same suggestion
  const { data: siblings } = await supabase
    .from("comments")
    .select("id, body, created_at, parent_id, vote_up, vote_down, report_count, is_hidden, users!comments_user_id_fkey(display_name, handle)")
    .eq("suggestion_id", c.suggestion_id)
    .order("created_at", { ascending: true })
    .limit(20);

  // Other comments by same author + flagged history
  const { data: authorComments, count: authorCommentCount } = await supabase
    .from("comments")
    .select("id, body, created_at, suggestion_id, report_count, is_hidden, suggestions!inner(items!inner(title))", { count: "exact" })
    .eq("user_id", c.user_id)
    .neq("id", c.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Author's TOTAL flagged count (any of their comments with reports)
  const { count: authorFlaggedCount } = await supabase
    .from("comments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", c.user_id)
    .gt("report_count", 0);

  return (
    <ReviewEditor
      comment={{
        id: c.id,
        body: c.body,
        createdAt: c.created_at,
        parentId: c.parent_id,
        suggestionId: c.suggestion_id,
        voteUp: c.vote_up ?? 0,
        voteDown: c.vote_down ?? 0,
        reportCount: c.report_count ?? 0,
        isHidden: c.is_hidden ?? false,
        hiddenReason: c.hidden_reason,
        hiddenAt: c.hidden_at,
      }}
      author={{
        id: c.users.id,
        displayName: c.users.display_name,
        handle: c.users.handle,
        email: c.users.email,
        avatarUrl: c.users.avatar_url,
        suggestionCount: c.users.suggestion_count,
        isVerified: c.users.is_verified,
        flaggedCommentsCount: authorFlaggedCount ?? 0,
      }}
      suggestion={{
        id: c.suggestions.id,
        reflection: c.suggestions.reflection,
        rating: c.suggestions.rating,
        createdAt: c.suggestions.created_at,
        suggesterName: c.suggestions.users.display_name,
        suggesterHandle: c.suggestions.users.handle,
        item: {
          id: c.suggestions.items.id,
          title: c.suggestions.items.title,
          category: c.suggestions.items.category,
          slug: c.suggestions.items.slug,
          posterUrl: c.suggestions.items.poster_url,
          backdropUrl: c.suggestions.items.backdrop_url,
        },
      }}
      reports={(reports ?? []).map((r: any) => ({
        id: r.id,
        reason: r.reason,
        description: r.description,
        resolved: r.resolved,
        resolutionAction: r.resolution_action,
        resolvedAt: r.resolved_at,
        createdAt: r.created_at,
        reporterName: r.users?.display_name ?? "—",
        reporterHandle: r.users?.handle ?? null,
      }))}
      siblings={(siblings ?? []).map((s: any) => ({
        id: s.id,
        body: s.body,
        createdAt: s.created_at,
        parentId: s.parent_id,
        voteUp: s.vote_up ?? 0,
        voteDown: s.vote_down ?? 0,
        reportCount: s.report_count ?? 0,
        isHidden: s.is_hidden ?? false,
        authorName: s.users.display_name,
        authorHandle: s.users.handle,
      }))}
      authorOtherComments={(authorComments ?? []).map((s: any) => ({
        id: s.id,
        body: s.body,
        createdAt: s.created_at,
        suggestionId: s.suggestion_id,
        itemTitle: s.suggestions.items.title,
        reportCount: s.report_count ?? 0,
        isHidden: s.is_hidden ?? false,
      }))}
      authorTotalComments={authorCommentCount ?? 0}
    />
  );
}
