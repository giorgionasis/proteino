import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Σύνδεση — Proteino" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="text-center space-y-3">
        <Link href="/" className="inline-block">
          <span className="text-[28px] font-medium text-gradient-coral tracking-tight">proteino</span>
        </Link>
        <div className="space-y-1">
          <h1 className="text-xl font-medium text-gray-900">Καλώς ήρθες πάλι!</h1>
          <p className="text-sm text-gray-500">Συνέχισε από όπου έμεινες.</p>
        </div>
      </div>

      {/* ── Form — wrapped in Suspense for useSearchParams ── */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
