import type { Metadata } from "next";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

export const metadata: Metadata = { title: "Ειδοποιήσεις — Proteino" };

export default function Page() {
  return <NotificationsPage />;
}
