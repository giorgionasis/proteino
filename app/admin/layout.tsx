import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { CommandPalette } from "@/components/admin/CommandPalette";

/**
 * Admin auth gate.
 *
 * In production: every request must have a Supabase session AND
 * `public.users.role === 'admin'`, else redirected.
 *
 * In dev: bypass is explicit-opt-in via `ADMIN_DEV_BYPASS=1`. We deliberately
 * do NOT auto-bypass on NODE_ENV=development — local builds against prod data
 * would otherwise leak admin access.
 */
const DEV_BYPASS = process.env.ADMIN_DEV_BYPASS === "1";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let displayName = "Admin";
  let avatarUrl: string | null = null;

  if (DEV_BYPASS) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[admin] DEV_BYPASS active in production — refusing.");
    } else {
      // Dev bypass: skip auth checks
      return (
        <div className="flex min-h-screen bg-zinc-50">
          <AdminSidebar user={{ display_name: "Dev Admin", avatar_url: null, role: "admin" }} />
          <main className="flex-1 ml-[220px] p-8">
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
              ⚠ DEV bypass active (<code>ADMIN_DEV_BYPASS=1</code>). Disable in prod.
            </div>
            {children}
          </main>
          <CommandPalette />
        </div>
      );
    }
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("users")
    .select("role, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const p = profile as { role?: string; display_name?: string; avatar_url?: string | null } | null;
  if (p?.role !== "admin") redirect("/");

  displayName = p?.display_name ?? user.email ?? "Admin";
  avatarUrl = p?.avatar_url ?? null;

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <AdminSidebar
        user={{
          display_name: displayName,
          avatar_url: avatarUrl,
          role: "admin",
        }}
      />
      <main className="flex-1 ml-[220px] p-8">{children}</main>
      <CommandPalette />
    </div>
  );
}
