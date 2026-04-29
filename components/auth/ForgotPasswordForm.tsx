"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Mail, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Animated checkmark ─────────────────────────────────────────
function AnimatedCheck() {
  return (
    <div className="flex justify-center animate-scale-in">
      <svg viewBox="0 0 80 80" fill="none" className="w-20 h-20">
        {/* Background circle */}
        <circle cx="40" cy="40" r="38" fill="#F0FDF8" />
        {/* Animated ring */}
        <circle
          cx="40" cy="40" r="38"
          stroke="#1D9E75" strokeWidth="2"
          strokeDasharray="239" strokeDashoffset="239"
          strokeLinecap="round"
          style={{ animation: "drawCheck 600ms ease 100ms both" }}
        />
        {/* Animated tick */}
        <path
          d="M24 40 L35 51 L56 29"
          stroke="#1D9E75" strokeWidth="3"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="48" strokeDashoffset="48"
          style={{ animation: "drawCheck 400ms ease 550ms both" }}
        />
      </svg>
    </div>
  );
}

// ── Sent state ─────────────────────────────────────────────────
function SentScreen({
  email,
  onResend,
  resendLoading,
}: {
  email:         string;
  onResend:      () => void;
  resendLoading: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-6 text-center animate-fade-in">
      <AnimatedCheck />

      <div className="space-y-2">
        <h2 className="text-xl font-medium text-gray-900">Έλεγξε το email σου</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Στείλαμε σύνδεσμο επαναφοράς κωδικού στο{" "}
          <span className="font-medium text-gray-700">{email}</span>.
          <br />
          Μπορεί να πάρει μερικά λεπτά.
        </p>
      </div>

      <div className="w-full space-y-3">
        <button
          type="button"
          onClick={onResend}
          disabled={resendLoading}
          className="text-sm text-coral-600 hover:underline disabled:opacity-50 transition-opacity"
        >
          {resendLoading ? "Αποστολή..." : "Δεν το έλαβες; Στείλε ξανά"}
        </button>

        <div className="flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Πίσω στη σύνδεση
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────
export function ForgotPasswordForm() {
  const [email,         setEmail]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [sent,          setSent]          = useState(false);
  const [error,         setError]         = useState("");
  const [shake,         setShake]         = useState(false);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function sendReset(isResend = false) {
    const target = isResend ? setResendLoading : setLoading;
    target(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
    );

    target(false);

    if (resetError) {
      setError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      triggerShake();
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <SentScreen
        email={email}
        onResend={() => sendReset(true)}
        resendLoading={resendLoading}
      />
    );
  }

  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !loading;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (canSubmit) sendReset(); }}
      noValidate
      className={cn("space-y-4", shake && "animate-shake")}
    >
      <Input
        type="email"
        label="Email λογαριασμού"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        leftIcon={<Mail size={16} strokeWidth={1.5} />}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
        hint="Θα σου στείλουμε σύνδεσμο για να επαναφέρεις τον κωδικό σου."
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-input border-[0.5px] border-danger/40 bg-red-50 px-4 py-3"
        >
          <span className="text-danger mt-0.5 shrink-0" aria-hidden>✕</span>
          <p className="text-sm text-danger leading-snug">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={loading}
        disabled={!canSubmit}
      >
        Αποστολή συνδέσμου
      </Button>

      <div className="flex justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Πίσω στη σύνδεση
        </Link>
      </div>
    </form>
  );
}
