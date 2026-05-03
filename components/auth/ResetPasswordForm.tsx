"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PasswordRuleList, checkPasswordRules, allRulesMet } from "./PasswordRuleList";
import { cn } from "@/lib/utils/cn";

/* ── Success screen ────────────────────────────────────────── */

function SuccessScreen() {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center animate-fade-in">
      {/* Animated check */}
      <div className="w-20 h-20 animate-scale-in">
        <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
          <circle cx="40" cy="40" r="38" fill="#F0FDF8" />
          <circle
            cx="40" cy="40" r="38"
            stroke="#1D9E75" strokeWidth="2"
            strokeDasharray="239" strokeDashoffset="239"
            strokeLinecap="round"
            style={{ animation: "drawCheck 600ms ease 100ms both" }}
          />
          <path
            d="M24 40 L35 51 L56 29"
            stroke="#1D9E75" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="48" strokeDashoffset="48"
            style={{ animation: "drawCheck 400ms ease 550ms both" }}
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#18181B" }}>
          Ο κωδικός άλλαξε!
        </h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Μπορείς τώρα να συνδεθείς με τον νέο σου κωδικό.
        </p>
      </div>

      <Link
        href="/login"
        className="w-full flex items-center justify-center rounded-sm h-14 text-lg font-bold text-white active:opacity-90 transition-opacity"
        style={{ backgroundColor: "#27272A" }}
      >
        Σύνδεση
      </Link>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────── */

export function ResetPasswordForm() {
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [focused,     setFocused]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [shake,       setShake]       = useState(false);
  const [success,     setSuccess]     = useState(false);

  const rules        = checkPasswordRules(password);
  const confirmError = confirm.length > 0 && confirm !== password ? "Οι κωδικοί δεν ταιριάζουν" : "";
  const showRules    = focused || password.length > 0;

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 500); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allRulesMet(rules)) { triggerShake(); return; }
    if (password !== confirm) { triggerShake(); return; }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      if (updateError.message.includes("same password")) {
        setError("Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον παλιό.");
      } else {
        setError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      }
      triggerShake();
      return;
    }

    setSuccess(true);
  }

  if (success) return <SuccessScreen />;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4 pt-4", shake && "animate-shake")}
    >
      {/* New password */}
      <div>
        <Input
          type="password"
          label="Νέος κωδικός"
          placeholder="Δημιούργησε νέο κωδικό"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="new-password"
          autoFocus
          disabled={loading}
        />
        <PasswordRuleList rules={rules} visible={showRules} />
      </div>

      {/* Confirm */}
      <Input
        type="password"
        label="Επιβεβαίωση κωδικού"
        placeholder="Επανάλαβε τον νέο κωδικό"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={confirmError}
        autoComplete="new-password"
        disabled={loading}
      />

      {/* Server error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-sm px-4 py-3"
          style={{ border: "2px solid #FE402B", backgroundColor: "#FFF2F1" }}
        >
          <span className="mt-0.5 shrink-0" style={{ color: "#FE402B" }} aria-hidden>✕</span>
          <p className="text-sm leading-snug" style={{ color: "#FE402B" }}>{error}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="black"
        fullWidth
        loading={loading}
        disabled={!allRulesMet(rules) || !!confirmError || !confirm}
        className="rounded-sm h-14 text-lg font-bold tracking-[0.01em]"
      >
        Αποθήκευση νέου κωδικού
      </Button>
    </form>
  );
}
