import { redirect } from "next/navigation";
import { createClient }      from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { GuestYouPage } from "@/components/profile/GuestYouPage";

export default async function YouPage() {
  let handle: string | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const sb = await createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        const u = session.user;
        const admin = createAdminClient();

        // Primary: look up by auth user ID
        const { data: byId } = (await (admin.from("users") as any)
          .select("handle")
          .eq("id", u.id)
          .maybeSingle()) as { data: { handle: string } | null };

        // Fallback: look up by email (Google OAuth may create a new auth UUID)
        let row = byId;
        if (!row && u.email) {
          const { data: byEmail } = (await (admin.from("users") as any)
            .select("handle")
            .eq("email", u.email)
            .maybeSingle()) as { data: { handle: string } | null };
          row = byEmail;
        }

        handle = row?.handle ?? null;
      }
    } catch { /* network error — show guest page */ }
  }

  if (handle) redirect(`/profile/${handle}`);
  return <GuestYouPage />;
}
