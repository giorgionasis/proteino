import type { Metadata } from "next";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Νέος κωδικός — Proteino" };

export default function ResetPasswordPage() {
  return (
    <div className="bg-white min-h-screen">
      <AuthHeader closeHref="/login" closeLabel="Κλείσιμο" />

      <div
        className="flex flex-col gap-3"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          padding: "32px 24px 40px",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#18181B", lineHeight: "130%" }}>
          Δημιούργησε νέο κωδικό
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
          Ο νέος σου κωδικός πρέπει να είναι διαφορετικός από τον προηγούμενο.
        </p>
      </div>

      <div className="px-6 pb-12">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
