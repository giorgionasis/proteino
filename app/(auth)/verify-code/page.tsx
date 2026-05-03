import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { VerifyCodeForm } from "@/components/auth/VerifyCodeForm";

export const metadata: Metadata = { title: "Επαλήθευση κωδικού — Proteino" };

export default function VerifyCodePage() {
  return (
    <div className="bg-white min-h-screen">
      <AuthHeader closeHref="/forgot-password" closeLabel="Πίσω" />

      {/* Title section */}
      <div
        className="flex flex-col gap-3"
        style={{
          background: "linear-gradient(180deg, #FAFAFA 0%, #FFFFFF 100%)",
          padding: "32px 24px 40px",
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#18181B", lineHeight: "130%" }}>
          Έλεγξε το email σου
        </h1>
        <p style={{ fontSize: 16, fontWeight: 400, color: "#18181B", lineHeight: "120%" }}>
          Στείλαμε έναν 6ψήφιο κωδικό επαλήθευσης στο email σου.
        </p>
      </div>

      <div className="px-6 pb-12">
        <Suspense fallback={null}>
          <VerifyCodeForm />
        </Suspense>
      </div>
    </div>
  );
}
