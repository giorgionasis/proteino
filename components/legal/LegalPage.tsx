"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { InnerHeader } from "@/components/layout/Header";
import { supportMailto, SUPPORT_EMAIL } from "@/lib/contact";

export interface LegalSection {
  title: string;
  body: React.ReactNode;
}

interface LegalPageProps {
  /** Header / browser title. */
  pageTitle: string;
  /** Hero headline (1-2 lines). Supports a `<br />` for line breaks. */
  heading: React.ReactNode;
  /** Hero subtitle paragraph. */
  intro: string;
  /** Last-updated date, e.g. "Μάιος 2026". */
  lastUpdated: string;
  /** Body sections, rendered in order. */
  sections: LegalSection[];
  /** Bottom CTA subject line for the mailto link. */
  contactSubject: string;
}

/**
 * Shared chrome for /terms and /privacy. Mirrors the HelpPage visual
 * grammar — InnerHeader, hero, sectioned body, mailto CTA. No external
 * data; legal copy lives in the page component that wraps this shell.
 */
export function LegalPage({
  pageTitle,
  heading,
  intro,
  lastUpdated,
  sections,
  contactSubject,
}: LegalPageProps) {
  const router = useRouter();
  return (
    <div className="pb-24">
      <InnerHeader title={pageTitle} onBack={() => router.back()} />

      <div className="px-6 pt-8 pb-2">
        <h1 className="text-[32px] leading-[110%] font-extrabold text-zinc-900">
          {heading}
        </h1>
        <p className="text-[16px] text-zinc-600 leading-[150%] mt-3 max-w-[340px]">
          {intro}
        </p>
        <p className="text-[12px] text-zinc-400 mt-3 uppercase tracking-[0.08em]">
          Τελευταία ενημέρωση · {lastUpdated}
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {sections.map((section, i) => (
          <section key={i} className="px-6">
            <h2 className="text-[18px] font-bold text-zinc-900 mb-3 leading-[130%]">
              {section.title}
            </h2>
            <div className="text-[15px] text-zinc-700 leading-[170%] space-y-3">
              {section.body}
            </div>
          </section>
        ))}
      </div>

      <section
        className="mx-6 mt-12 p-6 rounded-2xl bg-coral-50"
        style={{ border: "1px solid #FFE0DA" }}
      >
        <p className="text-[18px] font-extrabold text-zinc-900 leading-[130%]">
          Έχεις ερωτήσεις;
        </p>
        <p className="text-[15px] text-zinc-700 leading-[150%] mt-2">
          Στείλε μας email στο{" "}
          <span className="font-semibold">{SUPPORT_EMAIL}</span> και θα σου
          απαντήσουμε σύντομα.
        </p>
        <a
          href={supportMailto(contactSubject)}
          className="mt-4 inline-flex items-center justify-center h-12 px-6 rounded-xl bg-zinc-950 text-white text-[15px] font-bold active:bg-zinc-800 transition-colors"
        >
          Επικοινωνία με Email
        </a>
      </section>

      <div className="px-6 mt-10 flex gap-4 text-[14px] text-zinc-500">
        <Link href="/terms" className="underline-offset-2 hover:underline">
          Όροι Χρήσης
        </Link>
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Πολιτική Απορρήτου
        </Link>
        <Link href="/help" className="underline-offset-2 hover:underline">
          Κέντρο Βοήθειας
        </Link>
      </div>
    </div>
  );
}
