import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthTrustBadge } from "@/components/auth/AuthTrustBadge";

export const metadata: Metadata = { title: "Σύνδεση — Proteino" };

export default function LoginPage() {
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
            Καλώς ήρθες,
          </h1>
          <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
            Χαιρόμαστε που σε βλέπουμε και πάλι!
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 pb-12">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
