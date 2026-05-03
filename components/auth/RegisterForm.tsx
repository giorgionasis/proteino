"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { checkEmailExists } from "@/lib/auth/checkEmail";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons } from "./OAuthButtons";
import { AuthDivider } from "./AuthDivider";
import { PasswordRuleList, checkPasswordRules, allRulesMet } from "./PasswordRuleList";
import { cn } from "@/lib/utils/cn";

/* ── Validation ────────────────────────────────────────────── */

const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HANDLE_RE = /^[a-zA-Z0-9_.]{3,30}$/;

function validateHandle(v: string): string {
  if (!v) return "";
  if (v.length < 3) return "Τουλάχιστον 3 χαρακτήρες";
  if (v.length > 30) return "Έως 30 χαρακτήρες";
  if (!HANDLE_RE.test(v)) return "Μόνο γράμματα, αριθμοί, _ και .";
  return "";
}

function mapServerError(msg: string): string {
  if (msg.includes("User already registered") || msg.includes("already been registered"))
    return "Αυτό το email χρησιμοποιείται ήδη.";
  if (msg.includes("Password should be"))
    return "Ο κωδικός δεν πληροί τις απαιτήσεις.";
  if (msg.includes("Unable to validate email"))
    return "Μη έγκυρο email. Έλεγξε και ξαναπροσπάθησε.";
  return "Κάτι πήγε στραβά. Δοκίμασε ξανά.";
}

/* ── Success screen ────────────────────────────────────────── */

function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center animate-fade-in">
      <div className="relative w-20 h-20 animate-scale-in">
        <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
          <circle cx="40" cy="40" r="38" stroke="#1D9E75" strokeWidth="2" opacity="0.2" />
          <circle
            cx="40" cy="40" r="38"
            stroke="#1D9E75" strokeWidth="2"
            strokeDasharray="239" strokeDashoffset="0"
            strokeLinecap="round"
            style={{ animation: "drawCheck 600ms ease 100ms both" }}
          />
          <path
            d="M24 40 L35 51 L56 29"
            stroke="#1D9E75" strokeWidth="3"
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="48" strokeDashoffset="48"
            style={{ animation: "drawCheck 400ms ease 500ms both" }}
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-zinc-900">Καλώς ήρθες!</h2>
        <p className="text-sm text-zinc-500 leading-relaxed">
          Στείλαμε ένα σύνδεσμο επιβεβαίωσης στο{" "}
          <span className="font-semibold text-zinc-700">{email}</span>.
          <br />Έλεγξε το email σου για να ενεργοποιήσεις τον λογαριασμό σου.
        </p>
      </div>
      <Link href="/login" className="text-sm font-bold underline" style={{ color: "#FE6F5E" }}>
        Πήγαινε στη σύνδεση →
      </Link>
    </div>
  );
}

/* ── Types ─────────────────────────────────────────────────── */

type EmailState = "idle" | "checking" | "available" | "taken" | "invalid";

/* ── Component ─────────────────────────────────────────────── */

export function RegisterForm() {
  const [email,           setEmail]           = useState("");
  const [handle,          setHandle]          = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted,   setTermsAccepted]   = useState(false);

  const [emailState,    setEmailState]    = useState<EmailState>("idle");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [shake,         setShake]         = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [serverError,   setServerError]   = useState("");
  const [success,       setSuccess]       = useState(false);

  /* ── email blur check ────────────────────────────────── */
  async function handleEmailBlur() {
    const val = email.trim();
    if (!val) { setEmailState("idle"); return; }
    if (!EMAIL_RE.test(val)) { setEmailState("invalid"); return; }

    setEmailState("checking");
    const exists = await checkEmailExists(val);

    if (exists === null) {
      setEmailState("available"); // RPC unavailable — optimistic
    } else {
      setEmailState(exists ? "taken" : "available");
    }
  }

  /* ── derived errors ──────────────────────────────────── */
  const handleError   = validateHandle(handle);
  const passwordRules = checkPasswordRules(password);
  const confirmError  =
    confirmPassword.length > 0 && confirmPassword !== password
      ? "Οι κωδικοί δεν ταιριάζουν" : "";

  const emailError =
    emailState === "invalid" ? "Μη έγκυρο email" :
    emailState === "taken"   ? "Αυτό το email χρησιμοποιείται ήδη" :
    undefined;

  const emailSuccess =
    emailState === "available" ? "Email διαθέσιμο" : undefined;

  const showPasswordRules = passwordFocused || password.length > 0;

  /* ── submit ──────────────────────────────────────────── */
  function triggerShake() { setShake(true); setTimeout(() => setShake(false), 500); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !EMAIL_RE.test(email.trim())) { setEmailState("invalid"); triggerShake(); return; }
    if (emailState === "taken") { triggerShake(); return; }
    if (handleError) { triggerShake(); return; }
    if (!allRulesMet(passwordRules)) { triggerShake(); return; }
    if (password !== confirmPassword) { triggerShake(); return; }
    if (!termsAccepted) { triggerShake(); return; }

    setLoading(true);
    setServerError("");

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
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

    setLoading(false);

    if (error) {
      setServerError(mapServerError(error.message));
      triggerShake();
      return;
    }

    // Supabase returns a user with empty identities if email is already registered
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      setEmailState("taken");
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
      className={cn("space-y-4 pt-4", shake && "animate-shake")}
    >
      <OAuthButtons mode="register" />
      <AuthDivider />

      {/* Email */}
      <Input
        type="email"
        label="Email"
        placeholder="Συμπλήρωσε το email σου"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setEmailState("idle"); setServerError(""); }}
        onBlur={handleEmailBlur}
        error={emailError}
        success={emailSuccess}
        loading={emailState === "checking"}
        autoComplete="email"
        inputMode="email"
        autoFocus
        disabled={loading}
      />

      {/* Handle */}
      <Input
        type="text"
        label="Username"
        placeholder="your_handle"
        value={handle}
        onChange={(e) => { setHandle(e.target.value.toLowerCase()); setServerError(""); }}
        error={handle.length > 2 ? handleError : undefined}
        hint={!handle ? "3–30 χαρακτήρες, χωρίς κενά" : undefined}
        autoComplete="username"
        autoCapitalize="none"
        disabled={loading}
      />

      {/* Password + live rules */}
      <div>
        <Input
          type="password"
          label="Κωδικός"
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
        placeholder="Επανάλαβε τον κωδικό σου"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={confirmError}
        autoComplete="new-password"
        disabled={loading}
      />

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={loading}
            className="sr-only peer"
          />
          <div className={cn(
            "w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all",
            termsAccepted ? "bg-zinc-800 border-zinc-800" : "border-zinc-300 bg-white",
          )}>
            {termsAccepted && (
              <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </div>
        <span className="text-sm text-zinc-600 leading-snug pt-0.5">
          Συμφωνώ με τους{" "}
          <Link href="/support" className="text-coral-600 hover:underline">Όρους Χρήσης</Link>{" "}
          και την{" "}
          <Link href="/support" className="text-coral-600 hover:underline">Πολιτική Απορρήτου</Link>
        </span>
      </label>

      {/* Server error */}
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-sm px-4 py-3"
          style={{ border: "2px solid #FE402B", backgroundColor: "#FFF2F1" }}
        >
          <span className="mt-0.5 shrink-0" style={{ color: "#FE402B" }} aria-hidden>✕</span>
          <p className="text-sm leading-snug" style={{ color: "#FE402B" }}>{serverError}</p>
        </div>
      )}

      {/* Submit — always enabled */}
      <Button
        type="submit"
        variant="black"
        fullWidth
        loading={loading}
        className="rounded-sm h-14 text-lg font-bold tracking-[0.01em] mt-2"
      >
        Δημιουργία λογαριασμού
      </Button>

      <p className="text-center pt-2" style={{ fontSize: 16, color: "#18181B" }}>
        Έχεις ήδη λογαριασμό;{" "}
        <Link href="/login" className="font-bold underline" style={{ color: "#FE6F5E" }}>
          Σύνδεση
        </Link>
      </p>
    </form>
  );
}
