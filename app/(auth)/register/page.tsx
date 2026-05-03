import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthTrustBadge } from "@/components/auth/AuthTrustBadge";

export const metadata: Metadata = { title: "Εγγραφή — Proteino" };

export default function RegisterPage() {
  return (
    <div className="bg-white min-h-screen">
      <AuthHeader closeHref="/" />

      {/* Social section */}
      <div
        className="flex flex-col gap-8"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          padding: "24px 24px 40px",
        }}
      >
        <AuthTrustBadge />

        {/* Title */}
        <div className="flex flex-col gap-3">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#18181B", lineHeight: "130%" }}>
            Δημιούργησε λογαριασμό
          </h1>
          <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
            Μοιράσου αυτό που αξίζει να δει ο κόσμος.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 pb-12">
        <RegisterForm />
      </div>
    </div>
  );
}
