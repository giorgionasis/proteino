import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { createClient } from "@/lib/supabase/server";
import { fetchUserNotifications, groupNotifications } from "@/lib/notifications";

export const metadata: Metadata = { title: "Ειδοποιήσεις — Proteino" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?redirect=/notifications");

  const items = await fetchUserNotifications(sb, user.id, 100);
  const { unread, read } = groupNotifications(items);

  return <NotificationsPage unread={unread} read={read} />;
}
