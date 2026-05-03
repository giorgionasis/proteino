import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

// TODO: Re-enable auth check before production
const DEV_BYPASS_AUTH = process.env.NODE_ENV === "development";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let displayName = "Admin";
  let avatarUrl: string | null = null;

  if (!DEV_BYPASS_AUTH) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("users")
      .select("role, display_name, avatar_url")
      .eq("id", user.id)
      .single();

    const p = profile as { role?: string; display_name?: string; avatar_url?: string | null } | null;
    if (p?.role !== "admin") redirect("/");

    displayName = p?.display_name ?? user.email ?? "Admin";
    avatarUrl = p?.avatar_url ?? null;
  }

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
    </div>
  );
}
