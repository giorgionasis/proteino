import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

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
  const sb = createClient();
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

  const initialInterests = data?.preferences?.interests ?? [];
  const displayName      = data?.display_name ?? data?.handle ?? null;

  return (
    <OnboardingFlow
      initialInterests={initialInterests}
      displayName={displayName}
    />
  );
}
