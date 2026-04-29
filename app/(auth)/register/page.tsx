import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Εγγραφή — Proteino" };

export default function RegisterPage() {
  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <span className="text-[18px] font-medium text-gray-900 tracking-tight">Proteino</span>
        <Link
          href="/"
          aria-label="Κλείσιμο"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </Link>
      </div>

      {/* Trust banner */}
      <div className="mx-5 mb-6 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
        <ShieldCheck size={18} className="text-amber-500 shrink-0" />
        <p className="text-xs text-gray-500">Εγγυόμαστε για τις καλύτερες προτάσεις</p>
      </div>

      {/* Heading */}
      <div className="px-5 mb-6">
        <h1 className="text-[26px] font-medium text-gray-900 leading-tight">Δημιουργία λογαριασμού</h1>
        <p className="text-sm text-gray-500 mt-1">Μοιράσου αυτό που αξίζει να δει ο κόσμος.</p>
      </div>

      {/* Form */}
      <div className="px-5 pb-10">
        <RegisterForm />
      </div>
    </div>
  );
}
