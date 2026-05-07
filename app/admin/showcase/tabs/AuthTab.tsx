"use client";

import { useState } from "react";
import { ShowcaseSection, Variant } from "@/components/admin/showcase/ShowcaseSection";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthTrustBadge } from "@/components/auth/AuthTrustBadge";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { PasswordRuleList, checkPasswordRules } from "@/components/auth/PasswordRuleList";

export function AuthTab() {
  return (
    <>
      <AuthHeaderShowcase />
      <AuthDividerShowcase />
      <AuthTrustBadgeShowcase />
      <OAuthButtonsShowcase />
      <PasswordRuleListShowcase />
    </>
  );
}

function AuthHeaderShowcase() {
  return (
    <ShowcaseSection
      name="AuthHeader"
      filePath="components/auth/AuthHeader.tsx"
      description="Top bar on every /login, /register, /forgot-password screen — Proteino• logo on the left + close (X) link on the right that returns to the configured href."
      contextLinks={[
        { label: "Live (login)", href: "/login" },
        { label: "Live (register)", href: "/register" },
      ]}
    >
      <Variant label="Default → home">
        <div className="w-[400px] bg-white">
          <AuthHeader closeHref="/" />
        </div>
      </Variant>
      <Variant label="Custom close (back to login)">
        <div className="w-[400px] bg-white">
          <AuthHeader closeHref="/login" closeLabel="Πίσω" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function AuthDividerShowcase() {
  return (
    <ShowcaseSection
      name="AuthDivider"
      filePath="components/auth/AuthDivider.tsx"
      description="Horizontal 'ή' separator between OAuth buttons and the email form on auth screens. Two 160px lines with 'ή' centered between."
      contextLinks={[{ label: "Live (login)", href: "/login" }]}
    >
      <Variant label="Default">
        <div className="w-[400px] bg-white py-4">
          <AuthDivider />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function AuthTrustBadgeShowcase() {
  return (
    <ShowcaseSection
      name="AuthTrustBadge"
      filePath="components/auth/AuthTrustBadge.tsx"
      description="Reassurance pill below auth forms — green shield+check icon on light gray bg, 'Εγγυόμαστε για τις καλύτερες προτάσεις'."
      contextLinks={[{ label: "Live (register)", href: "/register" }]}
    >
      <Variant label="Default">
        <div className="w-[340px]">
          <AuthTrustBadge />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function OAuthButtonsShowcase() {
  return (
    <ShowcaseSection
      name="OAuthButtons"
      filePath="components/auth/OAuthButtons.tsx"
      description="Google + Facebook OAuth buttons. Both call supabase.auth.signInWithOAuth and redirect to /auth/callback. Mode prop changes the verb — 'Σύνδεση' (login) vs 'Εγγραφή' (register)."
      contextLinks={[
        { label: "Live (login)", href: "/login" },
        { label: "Live (register)", href: "/register" },
      ]}
    >
      <Variant label="Login mode">
        <div className="w-[340px]">
          <OAuthButtons mode="login" />
        </div>
      </Variant>
      <Variant label="Register mode">
        <div className="w-[340px]">
          <OAuthButtons mode="register" />
        </div>
      </Variant>
    </ShowcaseSection>
  );
}

function PasswordRuleListShowcase() {
  const [pw, setPw] = useState("");
  const rules = checkPasswordRules(pw);
  return (
    <ShowcaseSection
      name="PasswordRuleList"
      filePath="components/auth/PasswordRuleList.tsx"
      description="Live-validating password rules list — 3 rules (8+ chars / uppercase / number) with green-check ↔ gray-dot indicators. Hidden by default; shown when the password input gains focus or has typed content."
      contextLinks={[{ label: "Live (register)", href: "/register" }]}
    >
      <Variant label="Interactive — type to validate">
        <div className="w-[300px] flex flex-col gap-3">
          <input
            type="text"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Δοκίμασε έναν κωδικό"
            className="h-10 px-3 rounded border border-zinc-300 text-sm"
          />
          <PasswordRuleList rules={rules} visible />
        </div>
      </Variant>
      <Variant label="None met">
        <div className="w-[300px]">
          <PasswordRuleList rules={{ length: false, uppercase: false, number: false }} visible />
        </div>
      </Variant>
      <Variant label="2/3 met (length + number)">
        <div className="w-[300px]">
          <PasswordRuleList rules={{ length: true, uppercase: false, number: true }} visible />
        </div>
      </Variant>
      <Variant label="All met (3/3)">
        <div className="w-[300px]">
          <PasswordRuleList rules={{ length: true, uppercase: true, number: true }} visible />
        </div>
      </Variant>
      <Variant label="Hidden (no render)">
        <div className="text-xs text-zinc-400 italic text-center">(visible=false → no render)</div>
      </Variant>
    </ShowcaseSection>
  );
}
