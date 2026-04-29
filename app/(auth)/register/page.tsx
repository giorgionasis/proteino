import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Εγγραφή — Proteino" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <Link href="/" className="inline-block">
          <span className="text-[28px] font-medium text-gradient-coral tracking-tight">proteino</span>
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-gray-900">Δημιούργησε λογαριασμό</h1>
          <p className="text-sm text-gray-500">Μοιράσου αυτό που αξίζει να δει ο κόσμος.</p>
        </div>
        {/* Value props */}
        <div className="flex items-center justify-center gap-5">
          {[
            { icon: "✦", text: "AI αναζήτηση" },
            { icon: "✦", text: "Community" },
            { icon: "✦", text: "Δωρεάν" },
          ].map(({ icon, text }) => (
            <span key={text} className="flex items-center gap-1 text-xs text-gray-400">
              <span className="text-coral-500">{icon}</span>
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      <RegisterForm />
    </div>
  );
}
