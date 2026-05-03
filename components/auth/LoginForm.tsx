"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "@/lib/auth/checkEmail";
import { Input } from "@/components/ui/Input";

import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import { AuthDivider } from "./AuthDivider";
import { cn } from "@/lib/utils/cn";

/* ── helpers ──────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmailState = "idle" | "checking" | "found" | "not-found" | "invalid";

/* ── Component ────────────────────────────────────────────── */

export function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email,         setEmail]        = useState("");
  const [password,      setPassword]     = useState("");
  const [emailState,    setEmailState]   = useState<EmailState>("idle");
  const [passwordError, setPasswordError] = useState("");
  const [loading,       setLoading]      = useState(false);
  const [shake,         setShake]        = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "oauth") {
      setPasswordError("Η σύνδεση με OAuth απέτυχε. Δοκίμασε ξανά.");
    }
  }, [searchParams]);

  /* ── email blur check ─────────────────────────────────── */
  async function handleEmailBlur() {
    const val = email.trim();
    if (!val) { setEmailState("idle"); return; }
    if (!EMAIL_RE.test(val)) { setEmailState("invalid"); return; }

    setEmailState("checking");
    const exists = await checkEmailExists(val);

    if (exists === null) {
      // RPC not available — assume email is fine, validate on submit
      setEmailState("found");
    } else {
      setEmailState(exists ? "found" : "not-found");
    }
  }

  /* ── submit ───────────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Field-level guard
    if (!email.trim()) { setEmailState("invalid"); triggerShake(); return; }
    if (!EMAIL_RE.test(email.trim())) { setEmailState("invalid"); triggerShake(); return; }
    if (!password) { setPasswordError("Συμπλήρωσε τον κωδικό σου."); triggerShake(); return; }
    if (emailState === "not-found") { triggerShake(); return; }

    setLoading(true);
    setPasswordError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password,
    });

    if (!authError) {
      router.push("/");
      router.refresh();
      return;
    }

    setLoading(false);
    triggerShake();

    if (
      authError.message.includes("Invalid login credentials") ||
      authError.message.includes("invalid_credentials")
    ) {
      emailState === "found"
        ? setPasswordError("Ο κωδικός δεν αντιστοιχεί στο email που έχεις συμπληρώσει")
        : setEmailState("not-found");
    } else if (authError.message.includes("Email not confirmed")) {
      setPasswordError("Επιβεβαίωσε πρώτα το email σου.");
    } else {
      setPasswordError("Κάτι πήγε στραβά. Δοκίμασε ξανά.");
    }
  }

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  /* ── derived states ───────────────────────────────────── */
  const emailError =
    emailState === "invalid"   ? "Μη έγκυρο email" :
    emailState === "not-found" ? "Το email που έχεις συμπληρώσει δεν αντιστοιχεί σε κάποιο λογαριασμό χρήστη" :
    undefined;

  const emailSuccess = emailState === "found" ? "Email βρέθηκε" : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4 pt-4", shake && "animate-shake")}
    >
      {/* OAuth */}
      <OAuthButtons mode="login" />
      <AuthDivider />

      {/* Email */}
      <Input
        type="email"
        label="Email"
        placeholder="Συμπλήρωσε το email σου"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setEmailState("idle");
          setPasswordError("");
        }}
        onBlur={handleEmailBlur}
        error={emailError}
        success={emailSuccess}
        loading={emailState === "checking"}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
      />

      {/* Password + forgot link */}
      <div className="space-y-2">
        <Input
          type="password"
          label="Κωδικός"
          placeholder="Συμπλήρωσε τον κωδικό σου"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
          error={passwordError || undefined}
          autoComplete="current-password"
          disabled={loading}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="underline active:opacity-70 transition-opacity"
            style={{ fontSize: 14, fontWeight: 600, color: "#52525B" }}
          >
            Ξέχασες τον κωδικό σου;
          </Link>
        </div>
      </div>

      {/* Submit — always enabled */}
      <Button
        type="submit"
        variant="black"
        fullWidth
        loading={loading}
        className="rounded-sm h-14 text-lg font-bold tracking-[0.01em] mt-2"
      >
        Σύνδεση
      </Button>

      {/* Footer */}
      <p className="text-center pt-1" style={{ fontSize: 16, color: "#18181B" }}>
        Δεν έχεις λογαριασμό;{" "}
        <Link href="/register" className="font-bold underline" style={{ color: "#FE6F5E" }}>
          Κάνε Εγγραφή
        </Link>
      </p>
    </form>
  );
}
