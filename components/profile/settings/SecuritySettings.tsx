"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";
import { Modal } from "@/components/ui/Modal";

/**
 * Security settings page — password change · social account unlink ·
 * device history · global sign-out · account deactivation hook.
 *
 * Server (page.tsx) hydrates the static fields (identities, devices,
 * email). Mutations go through the dedicated API routes:
 *
 *   PATCH  /api/auth/password
 *   DELETE /api/auth/identities/[provider]
 *   POST   /api/auth/signout-all
 *
 * Each section is independent — failure in one doesn't affect the
 * others.
 */

export interface SecurityIdentity {
  id:                  string;
  provider:            string;
  last_sign_in_at:     string | null;
  identity_data_email: string | null;
}

export interface SecurityDevice {
  id:                string;
  os:                string | null;
  browser:           string | null;
  region:            string | null;
  device_image_type: string | null;
  login_at:          string;
}

interface Props {
  email:         string;
  lastUpdatedAt: string | null;
  identities:    SecurityIdentity[];
  devices:       SecurityDevice[];
}

const PROVIDER_LABEL: Record<string, { name: string; color: string }> = {
  google:   { name: "Google",   color: "#4285F4" },
  facebook: { name: "Facebook", color: "#1877F2" },
  apple:    { name: "Apple",    color: "#000000" },
  github:   { name: "GitHub",   color: "#181717" },
};

export function SecuritySettings({ email, lastUpdatedAt, identities, devices }: Props) {
  const router = useRouter();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [signoutOpen,  setSignoutOpen]  = useState(false);
  const [identList,    setIdentList]    = useState<SecurityIdentity[]>(identities);
  const [busy,         setBusy]         = useState<string | null>(null);
  const [toast,        setToast]        = useState<string | null>(null);

  // Auto-clear toast after 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const socialIdentities = identList.filter((i) => i.provider !== "email");
  const hasPassword      = identList.some((i) => i.provider === "email");

  async function unlinkIdentity(provider: string) {
    if (!window.confirm(`Σίγουρα θες να αποσυνδέσεις το ${PROVIDER_LABEL[provider]?.name ?? provider};`)) return;
    setBusy(provider);
    try {
      const res = await fetch(`/api/auth/identities/${provider}`, { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "unlink_failed");
      setIdentList((curr) => curr.filter((i) => i.provider !== provider));
      setToast("Αποσυνδέθηκε");
    } catch (e: any) {
      setToast(e?.message ?? "Η αποσύνδεση απέτυχε");
    } finally {
      setBusy(null);
    }
  }

  async function signOutAllDevices() {
    setBusy("signout-all");
    try {
      const res = await fetch("/api/auth/signout-all", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      // Local session was global-revoked too — bounce to login.
      router.replace("/login");
    } catch (e) {
      setToast("Η αποσύνδεση απέτυχε");
    } finally {
      setBusy(null);
      setSignoutOpen(false);
    }
  }

  return (
    <div className="pb-12">
      <InnerHeader title="Σύνδεση και Ασφάλεια" onBack={() => router.back()} />

      <div className="px-5 pt-6 space-y-12">

        {/* ── Email + Password ──────────────────────────────────────── */}
        <section className="space-y-4">
          <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Σύνδεση</p>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-1">
              <p className="text-[14px] font-medium text-zinc-500">Email</p>
              <p className="text-[16px] font-semibold text-zinc-800 break-all">{email}</p>
            </div>
          </div>

          <div className="flex items-start justify-between py-2 gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-[16px] font-bold text-zinc-700">Κωδικός πρόσβασης</p>
              <p className="text-[14px] font-normal text-zinc-500 leading-[140%]">
                {hasPassword
                  ? <>Τελευταία ενημέρωση:<br />{formatRelativeDate(lastUpdatedAt)}</>
                  : "Δεν έχει οριστεί κωδικός — συνδέεσαι μόνο μέσω social."}
              </p>
            </div>
            {hasPassword && (
              <button
                onClick={() => setPasswordOpen(true)}
                className="text-[16px] font-semibold text-zinc-900 underline active:opacity-70 transition-opacity shrink-0"
              >
                Επεξεργασία
              </button>
            )}
          </div>
        </section>

        <div className="h-px bg-[#DEDEDE]" />

        {/* ── Social accounts ───────────────────────────────────────── */}
        <section className="space-y-4">
          <p className="text-[20px] font-bold text-zinc-800 leading-[130%]">
            Λογαριασμοί στα μέσα<br />κοινωνικής δικτύωσης
          </p>

          {socialIdentities.length === 0 ? (
            <p className="text-[14px] text-zinc-500">Δεν έχει συνδεθεί κανένας λογαριασμός social.</p>
          ) : (
            <div className="space-y-5">
              {socialIdentities.map((acc, i) => {
                const label = PROVIDER_LABEL[acc.provider] ?? { name: acc.provider, color: "#71717A" };
                return (
                  <div key={acc.id}>
                    {i > 0 && <div className="h-px bg-[#DEDEDE] mb-5" />}
                    <div className="flex items-center justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <p className="text-[16px] font-bold text-zinc-700">{label.name}</p>
                        <p className="text-[14px] font-normal text-zinc-500 break-all">
                          {acc.identity_data_email ?? "Συνδεδεμένο"}
                        </p>
                      </div>
                      <button
                        disabled={busy === acc.provider}
                        onClick={() => unlinkIdentity(acc.provider)}
                        className="text-[16px] font-semibold text-zinc-900 underline active:opacity-70 transition-opacity disabled:opacity-30 shrink-0"
                      >
                        {busy === acc.provider ? "..." : "Αποσύνδεση"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="h-px bg-[#DEDEDE]" />

        {/* ── Device history ────────────────────────────────────────── */}
        <section className="space-y-5">
          <div className="space-y-3">
            <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Ιστορικό συσκευών</p>
            <p className="text-[14px] font-normal text-zinc-500 leading-[140%]">
              {devices.length > 0
                ? "Έχεις συνδεθεί στο λογαριασμό σου από τις παρακάτω συσκευές."
                : "Δεν έχουμε ακόμα ιστορικό συσκευών για τον λογαριασμό σου. Θα εμφανιστεί στις επόμενες συνδέσεις."}
            </p>
          </div>

          {devices.length > 0 && (
            <div className="space-y-6">
              {devices.map((d, i) => (
                <div key={d.id} className="flex items-start gap-4">
                  <div className="shrink-0 mt-1">
                    {d.device_image_type === "mobile" ? <MobileIcon /> : <DesktopIcon />}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[15px] font-semibold text-zinc-800">{d.os ?? "Άγνωστο OS"}</span>
                      {d.browser && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-zinc-400" />
                          <span className="text-[13px] text-zinc-600">{d.browser}</span>
                        </>
                      )}
                      {i === 0 && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#5CEDCB", color: "#033C2E" }}>
                          Πιο πρόσφατη
                        </span>
                      )}
                    </div>
                    {d.region && <p className="text-[13px] text-zinc-500">{d.region}</p>}
                    <p className="text-[13px] text-zinc-400">{formatDateTime(d.login_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setSignoutOpen(true)}
            disabled={busy === "signout-all"}
            className="text-[16px] font-bold text-zinc-800 underline active:opacity-70 transition-opacity disabled:opacity-30"
          >
            Αποσύνδεση από όλες τις συσκευές
          </button>
        </section>

        <div className="h-px bg-[#DEDEDE]" />

        {/* ── Account deactivation (UI only — backend pending) ───── */}
        <section className="space-y-4">
          <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Λογαριασμός</p>
          <p className="text-[14px] font-normal text-zinc-500 leading-[140%]">
            Απενεργοποίηση του λογαριασμού σου. Οι προτάσεις και οι αξιολογήσεις παραμένουν στην κοινότητα.
          </p>
          <button
            onClick={() => setToast("Η απενεργοποίηση δεν είναι ακόμα διαθέσιμη — γράψε μας στο support.")}
            className="text-[16px] font-bold underline active:opacity-70 transition-opacity"
            style={{ color: "#EC2525" }}
          >
            Απενεργοποίηση
          </button>
        </section>

      </div>

      {/* Modals + toasts */}
      {passwordOpen && (
        <PasswordChangeModal
          onClose={() => setPasswordOpen(false)}
          onSuccess={() => { setPasswordOpen(false); setToast("Ο κωδικός ενημερώθηκε."); }}
        />
      )}

      {signoutOpen && (
        <Modal
          open={signoutOpen}
          onClose={() => setSignoutOpen(false)}
          title="Αποσύνδεση από όλες τις συσκευές"
        >
          <p className="text-[14px] text-zinc-600 leading-[150%]">
            Όλες οι ενεργές συνεδρίες θα τερματιστούν. Θα χρειαστείς να συνδεθείς ξανά.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setSignoutOpen(false)}
              className="flex-1 h-11 rounded-lg border border-zinc-200 text-[14px] font-semibold text-zinc-700"
            >
              Ακύρωση
            </button>
            <button
              onClick={signOutAllDevices}
              disabled={busy === "signout-all"}
              className="flex-1 h-11 rounded-lg bg-coral-600 text-white text-[14px] font-semibold disabled:opacity-60"
            >
              {busy === "signout-all" ? "..." : "Αποσύνδεση"}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-lg bg-zinc-900 text-white text-[13px] font-medium shadow-lg max-w-[90vw] animate-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Password change modal ─────────────────────────────────────────────

function PasswordChangeModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [current, setCurrent] = useState("");
  const [next1,   setNext1]   = useState("");
  const [next2,   setNext2]   = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const minLength    = next1.length >= 8;
  const hasUppercase = /[A-Z]/.test(next1);
  const hasDigit     = /[0-9]/.test(next1);
  const matches      = next1.length > 0 && next1 === next2;
  const canSubmit    = !!current && minLength && hasUppercase && hasDigit && matches && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/password", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next1 }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? "Αποτυχία");
      onSuccess();
    } catch (e: any) {
      setError(e?.message ?? "Αποτυχία");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Αλλαγή κωδικού">
      <form onSubmit={submit} className="space-y-4">
        <Input label="Τρέχων κωδικός" type="password" value={current} onChange={setCurrent} autoFocus />
        <Input label="Νέος κωδικός" type="password" value={next1} onChange={setNext1} />
        <ul className="text-[12px] text-zinc-500 space-y-1 pl-1">
          <Rule ok={minLength}>Τουλάχιστον 8 χαρακτήρες</Rule>
          <Rule ok={hasUppercase}>Ένα κεφαλαίο γράμμα</Rule>
          <Rule ok={hasDigit}>Ένας αριθμός</Rule>
        </ul>
        <Input label="Επιβεβαίωση νέου κωδικού" type="password" value={next2} onChange={setNext2} />
        {next2.length > 0 && !matches && (
          <p className="text-[12px] text-red-600">Οι κωδικοί δεν ταιριάζουν.</p>
        )}
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 h-11 rounded-lg border border-zinc-200 text-[14px] font-semibold text-zinc-700">
            Ακύρωση
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 h-11 rounded-lg bg-coral-600 text-white text-[14px] font-semibold disabled:opacity-40"
          >
            {busy ? "..." : "Αποθήκευση"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Input({ label, type, value, onChange, autoFocus }: {
  label:      string;
  type:       string;
  value:      string;
  onChange:   (v: string) => void;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-zinc-700 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full h-11 px-3 rounded-lg border border-zinc-200 text-[15px] focus:outline-none focus:border-coral-600 transition-colors"
      />
    </label>
  );
}

function Rule({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className={ok ? "text-emerald-600" : "text-zinc-500"}>
      {ok ? "✓" : "·"} {children}
    </li>
  );
}

// ── Format helpers ────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "Άγνωστο";
  const then  = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Άγνωστο";
  const days  = Math.floor((Date.now() - then) / (24 * 3600 * 1000));
  if (days < 1)        return "Σήμερα";
  if (days === 1)      return "Χθες";
  if (days < 7)        return `${days} μέρες πριν`;
  if (days < 30)       return `${Math.floor(days / 7)} εβδομάδες πριν`;
  if (days < 365)      return `${Math.floor(days / 30)} μήνες πριν`;
  return `${Math.floor(days / 365)} χρόνια πριν`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("el-GR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Icons ─────────────────────────────────────────────────────────────

function DesktopIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden>
      <rect x="2" y="3" width="26" height="18" rx="2" stroke="#3F3F46" strokeWidth="1.5"/>
      <path d="M10 27h10M15 21v6" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function MobileIcon() {
  return (
    <svg width="19" height="30" viewBox="0 0 19 30" fill="none" aria-hidden>
      <rect x="1" y="1" width="17" height="28" rx="3" stroke="#3F3F46" strokeWidth="1.5"/>
      <circle cx="9.5" cy="25" r="1.5" fill="#3F3F46"/>
    </svg>
  );
}
