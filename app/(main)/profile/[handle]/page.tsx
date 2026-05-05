import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserProfile } from "@/components/profile/UserProfile";
import { UserProfileViewer } from "@/components/profile/UserProfileViewer";

interface Props {
  params: { handle: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `@${params.handle} — Proteino` };
}

export default async function ProfilePage({ params }: Props) {
  const authClient = createClient();
  const db = createAdminClient();

  let ownerHandle: string | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { data: { session } } = await authClient.auth.getSession();
      const u = session?.user;
      if (u) {
        // Primary: look up by auth user ID
        const { data: byId } = (await (db.from("users") as any)
          .select("handle")
          .eq("id", u.id)
          .maybeSingle()) as { data: { handle: string } | null };

        // Fallback: look up by email (Google OAuth may create a new auth UUID)
        let meRow = byId;
        if (!meRow && u.email) {
          const { data: byEmail } = (await (db.from("users") as any)
            .select("handle")
            .eq("email", u.email)
            .maybeSingle()) as { data: { handle: string } | null };
          meRow = byEmail;
        }

        ownerHandle = meRow?.handle ?? null;
      }
    } catch { /* network error — treat as visitor */ }
  }

  // Fetch user profile from DB
  const { data: profileData } = (await (db.from("users") as any)
    .select("id, display_name, handle, avatar_url, bio, suggestion_count, rating_count, level, points, avg_quality_score")
    .eq("handle", params.handle)
    .single()) as { data: any };

  if (!profileData) notFound();

  // Fetch follower/following counts + viewer-specific follow state in one round-trip
  const meId = (await authClient.auth.getUser()).data.user?.id ?? null;
  const [{ count: followerCount }, { count: followingCount }, followRow] = await Promise.all([
    db.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileData.id),
    db.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileData.id),
    meId && meId !== profileData.id
      ? db.from("follows").select("id").eq("follower_id", meId).eq("following_id", profileData.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const initialFollowing = !!(followRow as any)?.data;

  // Fetch user's suggestions with items to find the highest-rated one
  const { data: userSuggestions } = (await (db.from("suggestions") as any)
    .select("id, rating, items(id, title, slug, cover_url, avg_rating, rating_count, category, metadata)")
    .eq("user_id", profileData.id)
    .eq("is_published", true)
    .limit(100)) as { data: any[] | null };

  let topSuggestion: {
    title: string;
    subtitle: string;
    coverUrl: string | null;
    avgRating: number;
    ratingCount: number;
    href: string;
  } | null = null;

  if (userSuggestions?.length) {
    const sorted = (userSuggestions as any[])
      .filter((s) => s.items)
      .sort((a, b) => (b.items.avg_rating ?? 0) - (a.items.avg_rating ?? 0));
    if (sorted[0]) {
      const item = sorted[0].items;
      const tags: string[] = item.metadata?.tags ?? [];
      const cleanSlug = item.slug?.includes("/") ? item.slug.split("/").pop() : item.slug;
      topSuggestion = {
        title: item.title,
        subtitle: tags[0] ?? item.category ?? "",
        coverUrl: item.cover_url,
        avgRating: item.avg_rating ?? 0,
        ratingCount: item.rating_count ?? 0,
        href: `/${item.category}/${cleanSlug}`,
      };
    }
  }

  if (params.handle === ownerHandle) {
    let sessionAvatarUrl: string | null = null;
    let sessionDisplayName: string | null = null;

    try {
      const { data: { session } } = await authClient.auth.getSession();
      const u = session?.user;
      if (u) {
        sessionAvatarUrl  = u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null;
        sessionDisplayName = u.user_metadata?.display_name ?? u.user_metadata?.full_name ?? u.user_metadata?.name ?? null;
      }
    } catch { /* ignore */ }

    return (
      <UserProfile
        handle={params.handle}
        avatarUrl={profileData.avatar_url ?? sessionAvatarUrl ?? undefined}
        displayName={profileData.display_name ?? sessionDisplayName ?? undefined}
        bio={profileData.bio ?? undefined}
        suggestionCount={profileData.suggestion_count ?? 0}
        ratingCount={profileData.rating_count ?? 0}
        level={profileData.level ?? 1}
        followersCount={followerCount ?? 0}
        followingCount={followingCount ?? 0}
        avgQualityScore={profileData.avg_quality_score ?? 0}
        topSuggestion={topSuggestion}
      />
    );
  }

  return (
    <UserProfileViewer
      displayName={profileData.display_name ?? params.handle}
      handle={params.handle}
      avatarUrl={profileData.avatar_url}
      suggestionCount={profileData.suggestion_count ?? 0}
      ratingCount={profileData.rating_count ?? 0}
      level={profileData.level ?? 1}
      avgRating={profileData.avg_quality_score ?? 0}
      followerCount={followerCount ?? 0}
      followingCount={followingCount ?? 0}
      topSuggestion={topSuggestion}
      targetUserId={profileData.id}
      initialFollowing={initialFollowing}
    />
  );
}
