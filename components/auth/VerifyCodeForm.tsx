"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

const DIGITS = 6;

export function VerifyCodeForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const email        = searchParams.get("email") ?? "";

  const [digits,  setDigits]  = useState<string[]>(Array(DIGITS).fill(""));
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);
  const [resending, setResending] = useState(false);
  const [resent,  setResent]  = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 500); }

  /* ── digit input handlers ──────────────────────────── */

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError("");
    if (char && index < DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        setDigits(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < DIGITS - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!pasted) return;
    const next = [...digits];
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, DIGITS - 1)]?.focus();
  }

  /* ── submit ────────────────────────────────────────── */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length < DIGITS) {
      setError("Συμπλήρωσε και τα 6 ψηφία.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    setLoading(false);

    if (verifyError) {
      setError("Λάθος ή ληγμένος κωδικός. Δοκίμασε ξανά.");
      triggerShake();
      return;
    }

    router.push("/reset-password");
  }

  /* ── resend ────────────────────────────────────────── */

  async function handleResend() {
    if (resending || !email) return;
    setResending(true);
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 4000);
  }

  const token = digits.join("");

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-6 pt-4", shake && "animate-shake")}
    >
      {/* Email display */}
      {email && (
        <p className="text-sm text-zinc-500">
          Στείλαμε κωδικό στο{" "}
          <span className="font-semibold text-zinc-800">{email}</span>
        </p>
      )}

      {/* 6-digit input row */}
      <div className="flex gap-3 justify-center">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={loading}
            className={cn(
              "w-12 h-14 text-center font-bold text-xl bg-white outline-none transition-all rounded-sm",
              d
                ? "border-2 border-zinc-800 text-zinc-800"
                : "border border-zinc-400 text-zinc-800",
              error && "!border-2 !border-[#FE402B] !bg-[#FFF2F1]",
              "focus:border-2 focus:border-zinc-800",
            )}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm font-semibold text-center" style={{ color: "#FE402B" }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="black"
        fullWidth
        loading={loading}
        disabled={token.length < DIGITS}
        className="rounded-sm h-14 text-lg font-bold tracking-[0.01em]"
      >
        Επαλήθευση
      </Button>

      {/* Resend */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="text-sm font-semibold underline active:opacity-70 transition-opacity disabled:opacity-50"
          style={{ color: "#52525B" }}
        >
          {resending ? "Αποστολή..." : resent ? "✓ Στάλθηκε!" : "Δεν το έλαβες; Στείλε ξανά"}
        </button>
        <Link
          href="/login"
          className="text-sm font-semibold active:opacity-70 transition-opacity"
          style={{ color: "#A1A1AA" }}
        >
          Πίσω στη σύνδεση
        </Link>
      </div>
    </form>
  );
}
