import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { AuthHeader } from "@/components/auth/AuthHeader";

export const metadata: Metadata = { title: "Επαναφορά κωδικού — Proteino" };

export default function ForgotPasswordPage() {
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
          Ξέχασες τον κωδικό σου;
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
          Δεν υπάρχει πρόβλημα. Θα σου στείλουμε οδηγίες επαναφοράς.
        </p>
      </div>

      {/* Form */}
      <div className="px-6 pb-12">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
