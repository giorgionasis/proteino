import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Επαναφορά κωδικού — Proteino" };

export default function ForgotPasswordPage() {
  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <span className="text-[18px] font-medium text-gray-900 tracking-tight">Proteino</span>
        <Link
          href="/login"
          aria-label="Πίσω"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>
      </div>

      {/* Heading */}
      <div className="px-5 mb-6">
        <h1 className="text-[26px] font-medium text-gray-900 leading-tight">Επαναφορά κωδικού</h1>
        <p className="text-sm text-gray-500 mt-1">Εισάγαγε το email σου για να λάβεις οδηγίες.</p>
      </div>

      {/* Form */}
      <div className="px-5 pb-10">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
