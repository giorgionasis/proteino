"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import { AuthDivider } from "./AuthDivider";
import { cn } from "@/lib/utils/cn";

// ── Error mapping ──────────────────────────────────────────────
function mapError(msg: string): string {
  if (msg.includes("Invalid login credentials"))  return "Λάθος email ή κωδικός. Δοκίμασε ξανά.";
  if (msg.includes("Email not confirmed"))         return "Επιβεβαίωσε πρώτα το email σου.";
  if (msg.includes("Too many requests"))           return "Πολλές προσπάθειες. Περίμενε λίγο.";
  if (msg.includes("User not found"))              return "Δεν βρέθηκε λογαριασμός με αυτό το email.";
  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}

// ── Component ──────────────────────────────────────────────────
export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [shake,    setShake]    = useState(false);

  // Surface OAuth errors passed via query param
  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      setError("Η σύνδεση με OAuth απέτυχε. Δοκίμασε ξανά.");
    }
  }, [searchParams]);

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) return;

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError) {
      setLoading(false);
      setError(mapError(authError.message));
      triggerShake();
      return;
    }

    router.push("/");
    router.refresh();
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", shake && "animate-shake")}
    >
      {/* Email */}
      <Input
        type="email"
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
      />

      {/* Password + forgot link */}
      <div className="space-y-1.5">
        <Input
          type="password"
          label="Κωδικός"
          placeholder="••••••••"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          autoComplete="current-password"
          disabled={loading}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-coral-600 hover:text-coral-800 transition-colors"
          >
            Ξέχασες τον κωδικό;
          </Link>
        </div>
      </div>

      {/* Inline error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-input border-[0.5px] border-danger/40 bg-red-50 px-4 py-3"
        >
          <span className="text-danger mt-0.5 shrink-0" aria-hidden>✕</span>
          <p className="text-sm text-danger leading-snug">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        fullWidth
        size="lg"
        loading={loading}
        disabled={!canSubmit}
        className="mt-2"
      >
        Σύνδεση
      </Button>

      {/* OAuth */}
      <AuthDivider />
      <OAuthButtons mode="login" />

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 pt-2">
        Δεν έχεις λογαριασμό;{" "}
        <Link href="/register" className="text-coral-600 font-medium hover:underline">
          Εγγραφή
        </Link>
      </p>
    </form>
  );
}
