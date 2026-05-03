"use client";

import Image from "next/image";
import Link from "next/link";

const VALUE_PROPS = [
  {
    emoji: "🤖",
    title: "Προτάσεις που σε αφορούν",
    body: "Το AI μαθαίνει τι σου αρέσει και σου φέρνει ακριβώς αυτό που ψάχνεις.",
  },
  {
    emoji: "✨",
    title: "Μοιράσου ό,τι αγαπάς",
    body: "Πρότεινε ταινίες, βιβλία, εστιατόρια και πολλά ακόμα με μια πρόταση.",
  },
  {
    emoji: "🏆",
    title: "Κέρδισε badges και ανέβα επίπεδο",
    body: "Κάθε πρόταση που κάνεις σε φέρνει πιο κοντά στην κορυφή του leaderboard.",
  },
];

export function GuestYouPage() {
  return (
    <div className="pb-24 bg-white">

      {/* Blurred profile preview */}
      <div className="relative overflow-hidden" style={{ height: 260 }}>
        {/* Dimmed mock profile backdrop */}
        <div className="absolute inset-0 flex flex-col items-center pt-10 gap-4 select-none" aria-hidden>
          <div className="relative w-[88px] h-[88px] rounded-full bg-zinc-200 overflow-hidden border-[3px] border-white shrink-0" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
            <Image src="/images/profile-avatar.png" alt="" fill className="object-cover opacity-40" />
          </div>
          <div className="space-y-2 text-center">
            <div className="h-4 w-32 rounded bg-zinc-200 mx-auto" />
            <div className="h-3 w-20 rounded bg-zinc-100 mx-auto" />
          </div>
          <div className="flex gap-8 mt-2">
            {[["12", "Προτάσεις"], ["8", "Αξιολογήσεις"], ["47", "Ακόλουθοι"]].map(([n, l]) => (
              <div key={l} className="flex flex-col items-center gap-1">
                <div className="h-5 w-6 rounded bg-zinc-200" />
                <div className="h-3 w-14 rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.85) 60%, #FFFFFF 100%)",
        }} />

        {/* Lock badge */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ paddingTop: 60 }}>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white" style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.12)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="3" y="11" width="18" height="11" rx="2" stroke="#FE6F5E" strokeWidth="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4" stroke="#FE6F5E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-[13px] font-semibold text-zinc-500">Δημιούργησε λογαριασμό για να δεις το προφίλ σου</p>
          </div>
        </div>
      </div>

      {/* Value props */}
      <div className="px-6 space-y-6 mt-2">
        {VALUE_PROPS.map((vp) => (
          <div key={vp.title} className="flex items-start gap-4">
            <span className="text-[28px] leading-none shrink-0 mt-0.5">{vp.emoji}</span>
            <div className="space-y-1">
              <p className="text-[16px] font-bold text-zinc-800">{vp.title}</p>
              <p className="text-[14px] font-normal text-zinc-500 leading-[140%]">{vp.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="px-6 mt-10 space-y-4">
        <Link href="/register"
          className="block w-full h-[52px] rounded-[12px] text-[16px] font-bold text-white text-center leading-[52px] active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, #FE6F5E 0%, #FF9980 100%)" }}>
          Δημιούργησε λογαριασμό
        </Link>

        <Link href="/login"
          className="block w-full text-center text-[15px] font-semibold text-zinc-600 active:text-zinc-800 transition-colors py-2">
          Έχω ήδη λογαριασμό →
        </Link>
      </div>
    </div>
  );
}
