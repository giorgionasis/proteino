import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Επαναφορά κωδικού — Proteino" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <Link href="/" className="inline-block">
          <span className="text-[28px] font-medium text-gradient-coral tracking-tight">proteino</span>
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-gray-900">Επαναφορά κωδικού</h1>
          <p className="text-sm text-gray-500">Εισάγαγε το email σου για να λάβεις οδηγίες.</p>
        </div>
      </div>

      {/* ── Form ── */}
      <ForgotPasswordForm />
    </div>
  );
}
