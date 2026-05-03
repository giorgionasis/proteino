"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ForgotPasswordForm() {
  const router = useRouter();

  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [shake,   setShake]   = useState(false);

  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 500); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Συμπλήρωσε ένα έγκυρο email.");
      triggerShake();
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
    );

    setLoading(false);

    if (resetError) {
      setError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
      triggerShake();
      return;
    }

    // Pass email to the verify-code page via URL param
    router.push(`/verify-code?email=${encodeURIComponent(email.trim())}`);
  }

  const canSubmit = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !loading;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", shake && "animate-shake")}
    >
      <Input
        type="email"
        label="Email λογαριασμού"
        placeholder="Συμπλήρωσε το email σου"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError(""); }}
        error={error || undefined}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
        hint="Θα σου στείλουμε κωδικό επαναφοράς."
      />

      <Button
        type="submit"
        variant="black"
        fullWidth
        loading={loading}
        disabled={!canSubmit}
        className="rounded-sm h-14 text-lg font-bold tracking-[0.01em]"
      >
        Αποστολή κωδικού
      </Button>

      <div className="flex justify-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 active:opacity-70 transition-opacity"
          style={{ fontSize: 14, fontWeight: 600, color: "#52525B" }}
        >
          <ArrowLeft size={14} strokeWidth={1.5} />
          Πίσω στη σύνδεση
        </Link>
      </div>
    </form>
  );
}
