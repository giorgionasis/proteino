"use client";

import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

const HELP_ITEMS = [
  {
    title: "Κέντρο βοήθειας",
    description: "Βρες εύκολα και γρήγορα ερωτήσεις και απαντήσεις στο κέντρο βοήθειας",
    icon: <HelpCenterIcon />,
  },
  {
    title: "Email",
    description: "Στείλε μας ένα email με την ερώτηση ή την ιδέα σου",
    icon: <EmailIcon />,
  },
  {
    title: "Chat",
    description: "Χρησιμοποίησε την online υποστήριξη και θα σου απαντήσουμε άμεσα",
    icon: <ChatIcon />,
  },
] as const;

export function SupportPage() {
  const router = useRouter();
  return (
    <div className="pb-20">

      <InnerHeader title="Υποστήριξη" onBack={() => router.back()} />

      {/* Hero */}
      <div className="px-6 pt-8 flex items-center justify-between">
        <p className="text-[32px] leading-[110%]">
          <span className="font-semibold text-zinc-800">Είμαστε εδώ για </span>
          <span className="font-extrabold text-zinc-950">εσένα</span>
        </p>
        <SupportIllustration />
      </div>

      {/* Help items */}
      <div className="px-6 mt-10 space-y-6">
        <p className="text-[20px] font-bold text-zinc-800">Τρόποι υποστήριξης</p>

        <div className="space-y-8">
          {HELP_ITEMS.map((item, i) => (
            <HelpItem key={i} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HelpItem({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <button className="w-full text-left rounded-[12px] active:opacity-80 transition-opacity"
      style={{ padding: 20, border: "1px solid #D4D4D8" }}>
      <div className="space-y-5">
        {/* Title row */}
        <div className="flex items-center gap-3">
          {icon}
          <p className="text-[20px] font-bold text-zinc-800 leading-[51px]">{title}</p>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E0E0E0]" />

        {/* Description + arrow */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-[18px] font-medium text-zinc-800 leading-snug flex-1">{description}</p>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </div>
    </button>
  );
}

function HelpCenterIcon() {
  return (
    <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <defs>
          <linearGradient id="hc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF725E" />
            <stop offset="100%" stopColor="#164A7E" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="12" r="10" stroke="url(#hc-grad)" strokeWidth="1.5" fill="none"/>
        <path d="M9.5 9.5a2.5 2.5 0 015 0c0 2-2.5 2.5-2.5 4.5" stroke="url(#hc-grad)" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="12" cy="17.5" r="0.75" fill="url(#hc-grad)"/>
      </svg>
    </div>
  );
}

function EmailIcon() {
  return (
    <div className="w-[26px] h-[27px] flex items-center justify-center shrink-0">
      <svg width="26" height="20" viewBox="0 0 26 20" fill="none" aria-hidden>
        <defs>
          <linearGradient id="em-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E77A74" />
            <stop offset="100%" stopColor="#164A7E" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="24" height="18" rx="3" stroke="url(#em-grad)" strokeWidth="1.5"/>
        <path d="M1 5l12 8 12-8" stroke="url(#em-grad)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    </div>
  );
}

function ChatIcon() {
  return (
    <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0">
      <svg width="24" height="22" viewBox="0 0 24 22" fill="none" aria-hidden>
        <defs>
          <linearGradient id="ch-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E77A74" />
            <stop offset="100%" stopColor="#164A7E" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path d="M2 2h14a2 2 0 012 2v8a2 2 0 01-2 2H8l-5 4v-4H2a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="url(#ch-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M18 6h2a2 2 0 012 2v6a2 2 0 01-2 2h-1v3l-3-3h-3" stroke="url(#ch-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function SupportIllustration() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" fill="none" aria-hidden>
      {/* Simple support illustration: headset + speech bubbles */}
      <circle cx="65" cy="65" r="50" fill="#FFF5EC" />
      <circle cx="65" cy="52" r="18" fill="none" stroke="#FE6F5E" strokeWidth="2.5"/>
      <path d="M47 52a18 18 0 000 0" stroke="none"/>
      <rect x="42" y="62" width="10" height="16" rx="5" fill="#FE6F5E" opacity="0.3"/>
      <rect x="78" y="62" width="10" height="16" rx="5" fill="#FE6F5E" opacity="0.3"/>
      <path d="M47 65 Q47 85 65 87 Q83 85 83 65" stroke="#FE6F5E" strokeWidth="2.5" fill="none"/>
      <rect x="52" y="90" width="26" height="14" rx="7" fill="#FE6F5E" opacity="0.15"/>
      <path d="M60 45c0-3 3-5 5-5s5 2 5 5" stroke="#FE6F5E" strokeWidth="2" fill="none" strokeLinecap="round"/>
      {/* speech bubble */}
      <rect x="80" y="30" width="36" height="24" rx="8" fill="#FE6F5E" opacity="0.12" stroke="#FE6F5E" strokeWidth="1"/>
      <path d="M80 48l-8 6 2-6" fill="#FE6F5E" opacity="0.12"/>
      <circle cx="91" cy="42" r="2.5" fill="#FE6F5E" opacity="0.5"/>
      <circle cx="98" cy="42" r="2.5" fill="#FE6F5E" opacity="0.5"/>
      <circle cx="105" cy="42" r="2.5" fill="#FE6F5E" opacity="0.5"/>
    </svg>
  );
}
