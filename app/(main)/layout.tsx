import { createClient }        from "@/lib/supabase/server";
import { createAdminClient }    from "@/lib/supabase/admin";
import { AuthProvider }         from "@/components/layout/AuthProvider";
import { ClientAwareHeader }    from "@/components/layout/ClientAwareHeader";
import { BottomNav }            from "@/components/layout/BottomNav";
import { FAB }                  from "@/components/ui/FAB";
import { OverlayManager }       from "@/components/layout/OverlayManager";
import { MaintenanceBanner }    from "@/components/layout/MaintenanceBanner";
import { fetchAppSettings }     from "@/lib/app-settings";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  let isRegistered = false;
  let avatarUrl: string | null = null;
  let displayName: string | null = null;
  let notificationCount = 0;
  let maintenance = { mode: false, message: "" };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const u = session?.user;
      isRegistered = !!u;
      if (u) {
        // Prefer OAuth metadata (immediate, no DB hit), fall back to
        // public.users.avatar_url for users migrated from MySQL who
        // have an avatar in our table but not in auth metadata. Look
        // up by id first, then by email (Google OAuth occasionally
        // creates a new auth UUID — same fallback the YOU + profile
        // pages already use).
        avatarUrl = u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null;
        displayName =
          u.user_metadata?.display_name ??
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          null;
        // Look up public.users for missing fields. Most users (post-MySQL
        // migration) have a row keyed by id; Google OAuth occasionally
        // creates a new auth UUID with no matching row, so fall back to
        // email lookup. Same pattern as /you and /profile pages.
        if (!avatarUrl || !displayName) {
          const admin = createAdminClient();
          const { data: byId } = await (admin.from("users") as any)
            .select("avatar_url, display_name, handle")
            .eq("id", u.id)
            .maybeSingle();
          let row = byId as { avatar_url: string | null; display_name: string | null; handle: string | null } | null;
          if (!row && u.email) {
            const { data: byEmail } = await (admin.from("users") as any)
              .select("avatar_url, display_name, handle")
              .eq("email", u.email)
              .maybeSingle();
            row = byEmail as typeof row;
          }
          avatarUrl = avatarUrl ?? row?.avatar_url ?? null;
          displayName = displayName ?? row?.display_name ?? row?.handle ?? null;
        }
        // Real unread notification count for the bell badge
        const { count } = await sb
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", u.id)
          .eq("is_read", false);
        notificationCount = count ?? 0;
      }
      const settings = await fetchAppSettings(sb);
      maintenance = { mode: settings.maintenance_mode, message: settings.maintenance_message };
    } catch { /* network error — render as guest */ }
  }

  return (
    <AuthProvider>
      <div className="bg-[#F2F2F7]">
      <div className="min-h-screen bg-white flex flex-col max-w-[390px] mx-auto relative">
        {maintenance.mode && <MaintenanceBanner message={maintenance.message} />}

        {/* Shows Proteino logo only on the home page "/" */}
        <ClientAwareHeader isRegistered={isRegistered} notificationCount={notificationCount} />

        {/* Scrollable page content — clears fixed bottom nav */}
        <main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>

        {/* Fixed bottom chrome */}
        <BottomNav avatarUrl={avatarUrl} displayName={displayName} />
        <FAB />

        {/* Full-screen slide-up overlays — renders on top of everything */}
        <OverlayManager />
      </div>
      </div>
    </AuthProvider>
  );
}
