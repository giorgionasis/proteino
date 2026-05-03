"use client";

import { useRouter } from "next/navigation";
import { InnerHeader } from "@/components/layout/Header";

const DEVICES = [
  { os: "OS X 15.10.7", browser: "Safari",  location: "Γαλάτσι, Αττική", date: "29 Ιουν 2023, 23:45:13", icon: "desktop", current: true  },
  { os: "iOS 16.2",     browser: "Chrome",   location: "Γαλάτσι, Αττική", date: "29 Ιουν 2023, 23:45:13", icon: "mobile",  current: false },
  { os: "iOS 15.7",     browser: "Chrome",   location: "Γαλάτσι, Αττική", date: "29 Ιουν 2023, 23:45:13", icon: "mobile",  current: false },
];

export function SecuritySettings() {
  const router = useRouter();
  return (
    <div className="pb-12">

      <InnerHeader title="Σύνδεση και Ασφάλεια" onBack={() => router.back()} />

      <div className="px-5 pt-6 space-y-12">

        {/* Password */}
        <div className="space-y-4">
          <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Σύνδεση</p>
          <div className="flex items-center justify-between py-2">
            <div className="space-y-4">
              <p className="text-[16px] font-bold text-zinc-700">Κώδικος πρόσβασης</p>
              <p className="text-[16px] font-normal text-zinc-700 leading-[130%]">Τελευταία ενημέρωση:<br />9 μήνες νωρίτερα</p>
            </div>
            <button className="text-[16px] font-semibold text-zinc-900 underline active:opacity-70 transition-opacity">Επεξεργασία</button>
          </div>
        </div>

        <div className="h-px bg-[#DEDEDE]" />

        {/* Social accounts */}
        <div className="space-y-4">
          <p className="text-[20px] font-bold text-zinc-800 leading-[130%]">Λογαριασμοί στα μέσα<br />κοινωνικής δικτύωσης</p>
          <div className="space-y-5">
            {[
              { name: "Facebook", color: "#1877F2" },
              { name: "Google",   color: "#4285F4" },
            ].map((acc, i) => (
              <div key={acc.name}>
                {i > 0 && <div className="h-px bg-[#DEDEDE] mb-5" />}
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <p className="text-[16px] font-bold text-zinc-700">{acc.name}</p>
                    <p className="text-[16px] font-normal leading-[24px]" style={{ color: "#484848" }}>Εχετε συνδεθεί</p>
                  </div>
                  <button className="text-[16px] font-semibold text-zinc-900 underline active:opacity-70 transition-opacity">Αποσύνδεση</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-[#DEDEDE]" />

        {/* Device history */}
        <div className="space-y-6">
          <div className="space-y-6">
            <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Ιστορικό συσκευών</p>
            <p className="text-[14px] font-normal text-zinc-700 leading-[140%]">Έχεις συνδεθεί στο λογαριασμό σου από τις παρακάτω συσκευές.</p>
          </div>

          <div className="relative" style={{ minHeight: 540 }}>
            {DEVICES.map((device, i) => (
              <div key={i} className="absolute" style={{ top: i * 168, left: 2 }}>
                {device.current && (
                  <div className="inline-flex items-center px-2.5 py-2.5 rounded-[10px] mb-3" style={{ backgroundColor: "#5CEDCB" }}>
                    <span className="text-[16px] font-semibold" style={{ color: "#033C2E" }}>Τρέχουσα σύνδεση</span>
                  </div>
                )}
                <div className="flex items-start gap-9">
                  <div className="flex items-center gap-1.5 shrink-0">
                    {device.icon === "desktop"
                      ? <DesktopIcon />
                      : <MobileIcon filled={i === 2} />}
                    <div className="space-y-[2px]">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[16px] font-semibold text-zinc-700">{device.os}</span>
                        <span className="w-1 h-1 rounded-full bg-[#484848]" />
                        <span className="text-[14px] font-normal text-zinc-700">{device.browser}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] font-normal text-zinc-700">{device.location}</p>
                    <p className="text-[13px] font-normal text-zinc-700">{device.date}</p>
                    <button className="text-[14px] font-semibold text-zinc-800 underline active:opacity-70 transition-opacity">Αποσύνδεση συσκευής</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="text-[16px] font-bold text-zinc-800 underline active:opacity-70 transition-opacity">
            Αποσύνδεση από όλες τις συσκευές
          </button>
        </div>

        <div className="h-px bg-[#DEDEDE]" />

        {/* Account deletion */}
        <div className="space-y-5">
          <p className="text-[20px] font-bold text-zinc-800 leading-[140%]">Λογαριασμός</p>
          <p className="text-[14px] font-normal text-zinc-700 leading-[140%]">Απενεργοποίηση του λογαριασμού σου. Ο λογαριασμός θα απενεργοποιηθεί αυτόματα ωστόσο, οι προτάσεις και οι αξιολογήσεις που έχεις κάνει θα παραμείνουν.</p>
          <button className="text-[16px] font-bold underline active:opacity-70 transition-opacity" style={{ color: "#EC2525" }}>
            Απενεργοποίηση
          </button>
        </div>

      </div>
    </div>
  );
}

function DesktopIcon() {
  return <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden><rect x="2" y="3" width="26" height="18" rx="2" stroke="#3F3F46" strokeWidth="1.5"/><path d="M10 27h10M15 21v6" stroke="#3F3F46" strokeWidth="1.5" strokeLinecap="round"/></svg>;
}

function MobileIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="19" height="30" viewBox="0 0 19 30" fill="none" aria-hidden>
      <rect x="1" y="1" width="17" height="28" rx="3" stroke={filled ? "#484848" : "#3F3F46"} strokeWidth="1.5" fill={filled ? "rgba(72,72,72,0.08)" : "none"} />
      <circle cx="9.5" cy="25" r="1.5" fill={filled ? "#484848" : "#3F3F46"} />
    </svg>
  );
}
