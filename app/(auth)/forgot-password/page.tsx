import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthHeader } from "@/components/auth/AuthHeader";

export const metadata: Metadata = { title: "Επαναφορά κωδικού" };

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ email?: string; welcome?: string }>;
}) {
  const sp = await props.searchParams;
  const initialEmail = typeof sp.email === "string" ? sp.email.slice(0, 254) : "";
  // ?welcome=1 comes from the login form for accounts migrated from the
  // old proteino.gr (their password was never transferred).
  const welcome = sp.welcome === "1";
  return (
    <div className="bg-white min-h-screen">
      <AuthHeader closeHref="/login" closeLabel="Πίσω" />

      {/* Title section */}
      <div
        className="flex flex-col gap-3"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          padding: "32px 24px 40px",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#18181B", lineHeight: "130%" }}>
          {welcome ? "Όρισε νέο κωδικό" : "Ξέχασες τον κωδικό σου;"}
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
          {welcome
            ? "Θα σου στείλουμε στο email έναν κωδικό. Με αυτόν ορίζεις νέο κωδικό πρόσβασης και συνεχίζεις από εκεί που είχες μείνει."
            : "Δεν υπάρχει πρόβλημα. Θα σου στείλουμε οδηγίες επαναφοράς."}
        </p>
      </div>

      {/* Form */}
      <div className="px-6 pb-12">
        <ForgotPasswordForm initialEmail={initialEmail} />
      </div>
    </div>
  );
}
