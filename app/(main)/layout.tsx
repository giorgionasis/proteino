import { createClient }        from "@/lib/supabase/server";
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
  let notificationCount = 0;
  let maintenance = { mode: false, message: "" };
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      const u = session?.user;
      isRegistered = !!u;
      if (u) {
        avatarUrl = u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null;
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
        <BottomNav avatarUrl={avatarUrl} />
        <FAB />

        {/* Full-screen slide-up overlays — renders on top of everything */}
        <OverlayManager />
      </div>
      </div>
    </AuthProvider>
  );
}
