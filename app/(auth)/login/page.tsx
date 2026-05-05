import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthTrustBadge } from "@/components/auth/AuthTrustBadge";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Σύνδεση — Proteino" };

export default async function LoginPage() {
  // Real session validation — only redirect if the cookie actually decodes
  // to a valid session. Avoids the trap where a stale cookie (present but
  // expired) would otherwise bounce the user to /, leaving them unable to
  // reach the login form to re-authenticate.
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const sb = createClient();
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) redirect("/");
    } catch { /* network error — render form so the user isn't blocked */ }
  }

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
