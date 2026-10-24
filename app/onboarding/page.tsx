import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { getNavPublishedCategories } from "@/lib/categories-meta";

/**
 * /onboarding — gated server entry.
 *
 * - Not signed in → /login
 * - Already onboarded → /
 * - preferences column missing (migration 022 not applied) → render
 *   the flow anyway. Saving will return 503 with a clear message; we
 *   don't want a logged-in user trapped on a redirect loop because of
 *   a missing migration.
 *
 * The main-app layout redirects logged-in users WITHOUT `onboarded_at`
 * here, so this page is the canonical gate.
 */
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    redirect("/login?redirect=/onboarding");
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("preferences, display_name, handle")
    .eq("id", user.id)
    .maybeSingle<{
      preferences: { onboarded_at?: string; interests?: string[] } | null;
      display_name: string | null;
      handle: string | null;
    }>();

  // If migration 022 isn't applied yet (column missing), `error` will
  // be set with code 42703. Render the flow anyway — the user is
  // logged in and shouldn't be trapped.
  if (!error && data?.preferences?.onboarded_at) {
    redirect("/");
  }

  let initialInterests = data?.preferences?.interests ?? [];
  // Members migrated from the old proteino.gr already have suggestions —
  // pre-select the categories they wrote about instead of a blank grid.
  if (initialInterests.length === 0) {
    const { data: mine } = await (admin.from("suggestions") as any)
      .select("items!inner(category)")
      .eq("user_id", user.id)
      .eq("is_published", true)
      .limit(200);
    const counts = new Map<string, number>();
    for (const r of (mine ?? []) as Array<{ items: { category: string } | null }>) {
      const c = r.items?.category;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    initialInterests = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  }
  const displayName      = data?.display_name ?? data?.handle ?? null;
  const cats             = await getNavPublishedCategories();

  return (
    <OnboardingFlow
      initialInterests={initialInterests}
      displayName={displayName}
      categories={cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl, icon: c.icon }))}
    />
  );
}
