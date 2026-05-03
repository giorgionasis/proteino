"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/* ── Rich text helper ────────────────────────────────────────────── */

type Part = { text: string; bold?: boolean };

function RT({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        p.bold
          ? <strong key={i} className="font-bold">{p.text}</strong>
          : <span key={i}>{p.text}</span>
      )}
    </>
  );
}

/* ── Divider ─────────────────────────────────────────────────────── */

function Divider() {
  return <div className="h-px w-full bg-[#F2F2F7]" />;
}

/* ── Section header ──────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="pl-5 h-12 flex items-center">
      <span className="text-lg font-bold text-[#27272A]">{children}</span>
    </div>
  );
}

/* ── Row types ───────────────────────────────────────────────────── */

function AvatarRow({ src, children }: { src: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 pl-5 pr-5">
      <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
        <Image src={src} alt="" width={44} height={44} className="w-full h-full object-cover" />
      </div>
      <p className="text-base text-[#18181B] leading-snug flex-1">{children}</p>
    </div>
  );
}

function ImageRow({
  src,
  size = 44,
  children,
}: {
  src: string;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 pl-5 pr-5">
      <div
        className="rounded-[4px] overflow-hidden shrink-0"
        style={{ width: size, height: size }}
      >
        <Image src={src} alt="" width={size} height={size} className="w-full h-full object-cover" />
      </div>
      <p className="text-base text-[#18181B] leading-snug flex-1">{children}</p>
    </div>
  );
}

function ProteinoRow({
  children,
  bigImageSrc,
}: {
  children: React.ReactNode;
  bigImageSrc?: string;
}) {
  return (
    <div className="pl-5 pr-5 flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <div className="w-[50px] h-[43px] shrink-0">
          <Image
            src="/figma-assets/notifications/proteino-icon.png"
            alt="Proteino"
            width={50}
            height={43}
            className="w-full h-full object-contain"
          />
        </div>
        <p className="text-base text-[#18181B] leading-snug flex-1">{children}</p>
      </div>
      {bigImageSrc && (
        <div
          className="rounded-[4px] overflow-hidden"
          style={{ aspectRatio: "288 / 201.6" }}
        >
          <Image
            src={bigImageSrc}
            alt=""
            width={288}
            height={202}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

export function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="bg-white">
      {/* Header */}
      <header
        className="sticky top-0 z-30 bg-white flex items-center justify-between h-14"
        style={{ boxShadow: "0px 1px 7px -2px rgba(0,0,0,0.15)" }}
      >
        <span className="pl-6 text-[22px] font-bold leading-tight text-[#18181B]">
          Ειδοποιήσεις
        </span>
        <button
          onClick={() => router.back()}
          aria-label="Κλείσιμο"
          className="w-12 h-12 flex items-center justify-center mr-1.5 rounded-full active:bg-zinc-100 transition-colors"
        >
          <X size={20} strokeWidth={2.5} className="text-zinc-700" />
        </button>
      </header>

      {/* ── Νέες ────────────────────────────────────────────────── */}
      <section className="pt-1 pb-6 flex flex-col">
        <SectionLabel>Νέες</SectionLabel>
        <div className="flex flex-col gap-5">
          <AvatarRow src="/figma-assets/notifications/avatar-eleni.png">
            <RT parts={[
              { text: "Η " },
              { text: "Eleni Pap", bold: true },
              { text: " αξιολόγησε με 4 αστέρια την πρότασή σου " },
              { text: "Inception", bold: true },
            ]} />
          </AvatarRow>
          <Divider />
          <AvatarRow src="/figma-assets/notifications/avatar-katerina.png">
            <RT parts={[
              { text: "Η " },
              { text: "Κατερίνα Κυρ", bold: true },
              { text: " μόλις δημοσίευσε μια νέα πρόταση στην κατηγορία " },
              { text: "Ταινίες", bold: true },
            ]} />
          </AvatarRow>
        </div>
      </section>

      {/* ── Παλιότερες ──────────────────────────────────────────── */}
      <section className="pb-8 flex flex-col">
        <SectionLabel>Παλιότερες</SectionLabel>
        <div className="flex flex-col gap-5">
          <ImageRow src="/figma-assets/notifications/inception.png">
            <RT parts={[
              { text: "Η πρότασή σου " },
              { text: "Inception", bold: true },
              { text: " έχει δημοσιευτεί και είναι διαθέσιμη για όλους." },
            ]} />
          </ImageRow>
          <Divider />
          <ProteinoRow bigImageSrc="/figma-assets/notifications/mpakalotaverna.png">
            <RT parts={[
              { text: "Μπακαλοταβέρνα:", bold: true },
              { text: " Νέα πρόταση στην κατηγορία φαγητό στο Χαλάνδρι" },
            ]} />
          </ProteinoRow>
          <Divider />
          <AvatarRow src="/figma-assets/notifications/avatar-franki.png">
            <RT parts={[
              { text: "Ο " },
              { text: "Franki", bold: true },
              { text: " βρήκε χρήσιμη την αξιολόγησή σου στην πρόταση " },
              { text: "Εκεί που τραγουδούν οι καραβίδες", bold: true },
              { text: "." },
            ]} />
          </AvatarRow>
          <Divider />
          <AvatarRow src="/figma-assets/notifications/avatar-libero.png">
            <RT parts={[
              { text: "Ο " },
              { text: "Libero", bold: true },
              { text: " αξιολόγησε την πρόταση " },
              { text: "Λαχανοντολμάδες Νηστίσιμοι", bold: true },
            ]} />
          </AvatarRow>
          <Divider />
          <ImageRow src="/figma-assets/notifications/mpakalotaverna2.png">
            <RT parts={[
              { text: "Μπακαλοταβέρνα", bold: true },
              { text: ": Νέα πρόταση στην κατηγορία φαγητό στο Χαλάνδρι" },
            ]} />
          </ImageRow>
          <Divider />
          <ProteinoRow>
            <RT parts={[
              { text: "Το εστιατόριο " },
              { text: "Φυσαρμόνικα Μεζεδοποτείον", bold: true },
              { text: " στο Χολαργό πιστεύουμε σου ταιριάζει." },
            ]} />
          </ProteinoRow>
          <Divider />
          <AvatarRow src="/figma-assets/notifications/avatar-konstantina.png">
            <RT parts={[
              { text: "Η " },
              { text: "KonstantinaF", bold: true },
              { text: " αξιολόγησε με 5 αστέρια την πρότασή σου " },
              { text: "Σπιτική Μηλόπιτα", bold: true },
            ]} />
          </AvatarRow>
          <Divider />
          <ImageRow src="/figma-assets/notifications/badge-achievement.png" size={50}>
            <RT parts={[
              { text: "Συγχαρητήρια! Ολοκλήρωσες " },
              { text: "10 προτάσεις", bold: true },
              { text: " και κέρδισες τη διάκριση του Έμπειρου χρήστη, συνέχισε έτσι!" },
            ]} />
          </ImageRow>
        </div>
      </section>
    </div>
  );
}
