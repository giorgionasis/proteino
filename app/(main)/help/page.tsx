import type { Metadata } from "next";
import { HelpPage } from "@/components/help/HelpPage";

export const metadata: Metadata = {
  title: "Κέντρο Βοήθειας",
  description: "Συχνές ερωτήσεις και απαντήσεις για το Proteino — πώς να κάνεις προτάσεις, να αξιολογήσεις, να διαχειριστείς τον λογαριασμό σου.",
  alternates: { canonical: "/help" },
};

export default function Page() {
  return <HelpPage />;
}
