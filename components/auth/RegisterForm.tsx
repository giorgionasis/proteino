"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import { AuthDivider } from "./AuthDivider";
import { PasswordRuleList, checkPasswordRules, allRulesMet } from "./PasswordRuleList";
import { cn } from "@/lib/utils/cn";

const LABEL = "text-[13px] font-medium text-gray-700 normal-case tracking-normal";

// ── Validation helpers ─────────────────────────────────────────
const HANDLE_RE = /^[a-zA-Z0-9_.]{3,30}$/;

function validateHandle(v: string): string {
  if (!v) return "";
  if (v.length < 3) return "Τουλάχιστον 3 χαρακτήρες";
  if (v.length > 30) return "Έως 30 χαρακτήρες";
  if (!HANDLE_RE.test(v)) return "Μόνο γράμματα, αριθμοί, _ και .";
  return "";
}

function validateEmail(v: string): string {
  if (!v) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Μη έγκυρο email";
}

function mapError(msg: string): string {
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "Αυτό το email χρησιμοποιείται ήδη.";
  if (msg.includes("Password should be"))
    return "Ο κωδικός δεν πληροί τις απαιτήσεις.";
  if (msg.includes("Unable to validate email"))
    return "Μη έγκυρο email. Έλεγξε και ξαναπροσπάθησε.";
  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}

// ── Success screen ─────────────────────────────────────────────
function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-in">
      {/* Animated checkmark */}
      <div className="relative w-20 h-20 animate-scale-in">
        <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
          <circle cx="40" cy="40" r="38" stroke="#1D9E75" strokeWidth="2" opacity="0.2" />
          <circle
            cx="40" cy="40" r="38"
            stroke="#1D9E75" strokeWidth="2"
            strokeDasharray="239"
            strokeDashoffset="0"
            strokeLinecap="round"
            style={{ animation: "drawCheck 600ms ease 100ms both" }}
          />
          <path
            d="M24 40 L35 51 L56 29"
            stroke="#1D9E75"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            strokeDashoffset="48"
            style={{ animation: "drawCheck 400ms ease 500ms both" }}
          />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-medium text-gray-900">Καλώς ήρθες!</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Στείλαμε ένα σύνδεσμο επιβεβαίωσης στο{" "}
          <span className="font-medium text-gray-700">{email}</span>.
          <br />
          Έλεγξε το email σου για να ενεργοποιήσεις τον λογαριασμό σου.
        </p>
      </div>

      <Link
        href="/login"
        className="text-sm text-coral-600 font-medium hover:underline"
      >
        Πήγαινε στη σύνδεση →
      </Link>
    </div>
  );
}

// ── Register form ──────────────────────────────────────────────
export function RegisterForm() {
  const [email,           setEmail]           = useState("");
  const [handle,          setHandle]          = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted,   setTermsAccepted]   = useState(false);

  const [passwordFocused, setPasswordFocused] = useState(false);
  const [shake,           setShake]           = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [serverError,     setServerError]     = useState("");
  const [success,         setSuccess]         = useState(false);

  // Real-time validation
  const emailError    = validateEmail(email);
  const handleError   = validateHandle(handle);
  const passwordRules = checkPasswordRules(password);
  const confirmError  =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Οι κωδικοί δεν ταιριάζουν"
      : "";

  const showPasswordRules = passwordFocused || password.length > 0;

  const canSubmit =
    !loading &&
    email.trim().length > 0 &&
    !emailError &&
    handle.trim().length > 0 &&
    !handleError &&
    allRulesMet(passwordRules) &&
    password === confirmPassword &&
    termsAccepted;

  function triggerShake() {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) { triggerShake(); return; }

    setLoading(true);
    setServerError("");

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          handle:       handle.trim().toLowerCase(),
          display_name: handle.trim(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setLoading(false);
      setServerError(mapError(error.message));
      triggerShake();
      return;
    }

    setSuccess(true);
  }

  if (success) return <SuccessScreen email={email} />;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", shake && "animate-shake")}
    >
      {/* OAuth first — per design */}
      <OAuthButtons mode="register" />
      <AuthDivider />

      {/* Email */}
      <Input
        type="email"
        label="Email"
        labelClassName={LABEL}
        placeholder="Συμπλήρωσε το email σου"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setServerError(""); }}
        error={email.length > 4 ? emailError : undefined}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
      />

      {/* Handle */}
      <Input
        type="text"
        label="Username"
        labelClassName={LABEL}
        placeholder="your_handle"
        value={handle}
        onChange={(e) => { setHandle(e.target.value.toLowerCase()); setServerError(""); }}
        error={handle.length > 2 ? handleError : undefined}
        hint={!handleError && handle.length > 0 ? undefined : "3–30 χαρακτήρες, χωρίς κενά"}
        autoComplete="username"
        autoCapitalize="none"
        disabled={loading}
      />

      {/* Password + live rules */}
      <div>
        <Input
          type="password"
          label="Κωδικός"
          labelClassName={LABEL}
          placeholder="Δημιούργησε κωδικό"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setServerError(""); }}
          autoComplete="new-password"
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          disabled={loading}
        />
        <PasswordRuleList rules={passwordRules} visible={showPasswordRules} />
      </div>

      {/* Confirm password */}
      <Input
        type="password"
        label="Επιβεβαίωση κωδικού"
        labelClassName={LABEL}
        placeholder="Επανάλαβε τον κωδικό σου"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmError}
        autoComplete="new-password"
        disabled={loading}
      />

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer normal-case tracking-normal">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={loading}
            className="sr-only peer"
          />
          <div
            className={cn(
              "w-5 h-5 rounded-[6px] border-[0.5px] flex items-center justify-center transition-all",
              termsAccepted
                ? "gradient-coral border-coral-600"
                : "border-gray-300 bg-white",
            )}
          >
            {termsAccepted && (
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-gray-600 leading-snug pt-0.5">
          Συμφωνώ με τους{" "}
          <Link href="/terms" className="text-coral-600 hover:underline">
            Όρους Χρήσης
          </Link>{" "}
          και την{" "}
          <Link href="/privacy" className="text-coral-600 hover:underline">
            Πολιτική Απορρήτου
          </Link>
        </span>
      </label>

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-input border-[0.5px] border-danger/40 bg-red-50 px-4 py-3"
        >
          <span className="text-danger mt-0.5 shrink-0" aria-hidden>✕</span>
          <p className="text-sm text-danger leading-snug">{serverError}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        variant="black"
        fullWidth
        size="lg"
        loading={loading}
        disabled={!canSubmit}
        className="mt-2"
      >
        Δημιουργία λογαριασμού
      </Button>

      {/* Footer */}
      <p className="text-center text-sm text-gray-500 pt-2">
        Έχεις ήδη λογαριασμό;{" "}
        <Link href="/login" className="text-coral-600 font-medium hover:underline">
          Σύνδεση
        </Link>
      </p>
    </form>
  );
}
