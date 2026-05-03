"use client";

import { useState } from "react";
import Image from "next/image";

/* ── Icons ────────────────────────────────────────────────────── */

function StarIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill="#27272A" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon({ color = "#3F3F46" }: { color?: string }) {
  return (
    <svg width="10" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Props ────────────────────────────────────────────────────── */

export interface OwnSuggestionCardProps {
  imageSrc: string;
  title: string;
  rating: number;
  reviewCount: number;
  isTopRated?: boolean;
  isProcessing?: boolean;
  onEdit?: () => void;
}

type CardState = "front" | "confirming" | "deleted";

/* ── States ───────────────────────────────────────────────────── */

function FrontState({
  imageSrc,
  title,
  rating,
  reviewCount,
  isTopRated,
  isProcessing,
  onEdit,
  onDeleteTap,
}: OwnSuggestionCardProps & { onDeleteTap: () => void }) {
  return (
    <div className="rounded-[12px] bg-white overflow-hidden flex flex-col gap-4">
      {/* Image */}
      <div className="relative overflow-hidden rounded-[12px]" style={{ height: 228 }}>
        <Image src={imageSrc} alt={title} fill className="object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 69%, rgba(0,0,0,0.33) 100%)" }}
        />
        {isTopRated && (
          <div
            className="absolute top-4 left-4 flex items-center justify-center px-2.5 py-2.5 rounded-full"
            style={{ backgroundColor: "#EDEDED", boxShadow: "4px 4px 9px -4px rgba(0,0,0,0.25)" }}
          >
            <span className="text-sm font-medium text-[#27272A]">Top rated</span>
          </div>
        )}
      </div>

      {/* Description: title (left) + rating (right) */}
      <div className="flex items-center justify-between px-3">
        <p className="text-lg font-bold text-[#18181B]" style={{ maxWidth: 200 }}>{title}</p>
        <div className="flex items-center gap-1">
          <StarIcon />
          <span className="text-base font-semibold text-[#27272A]">{rating}</span>
          <span className="text-base font-semibold text-[#27272A]">({reviewCount})</span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-5">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-[8px] active:opacity-70 transition-opacity"
          style={{ backgroundColor: "#F4F4F5" }}
        >
          <PencilIcon />
          <span className="text-base font-semibold text-[#3F3F46]">επεξεργασία</span>
        </button>
        <button
          onClick={onDeleteTap}
          className="flex-1 flex items-center justify-center gap-1.5 h-12 rounded-[8px] active:opacity-70 transition-opacity"
          style={{ backgroundColor: "#FFF2F1" }}
        >
          <TrashIcon />
          <span className="text-base font-semibold text-[#3F3F46]">διαγραφή</span>
        </button>
      </div>

      {/* Processing banner */}
      {isProcessing && (
        <div
          className="flex items-center justify-center rounded-b-[8px]"
          style={{ height: 60, backgroundColor: "#E5FFF9", marginTop: -16 }}
        >
          <p className="text-base font-semibold text-[#022C22]">Επεξεργαζόμαστε την αλλαγή σου</p>
        </div>
      )}
    </div>
  );
}

function ConfirmingState({
  title,
  onCancel,
  onConfirm,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="rounded-[12px] bg-white overflow-hidden flex flex-col"
      style={{ minHeight: 317 }}
    >
      {/* Top content */}
      <div className="flex flex-col gap-4 px-6 pt-10 flex-1">
        {/* Red trash icon in light circle */}
        <div
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ backgroundColor: "#FFF2F1" }}
        >
          <TrashIcon color="#FE402B" />
        </div>

        <p className="text-[22px] font-bold text-[#27272A] leading-[120%]">Διαγραφή Πρότασης</p>
        <p className="text-base font-semibold text-[#71717A] leading-[120%]">{title}</p>

        <p className="text-sm text-[#27272A] leading-snug">
          Η πρότασή σου θα διαγραφεί δεν θα είναι διαθέσιμη στην πλατφόρμα
        </p>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center justify-end gap-3 px-5 py-3.5 rounded-b-[12px]"
        style={{ backgroundColor: "#FAFAFA" }}
      >
        <button
          onClick={onCancel}
          className="w-[90px] flex items-center justify-center py-3 rounded-full active:opacity-70 transition-opacity"
        >
          <span className="text-sm font-semibold text-[#27272A]">Άκυρο</span>
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center justify-center px-4 py-3 rounded-[4px] active:opacity-80 transition-opacity"
          style={{ backgroundColor: "#FE402B" }}
        >
          <span className="text-sm font-bold text-white">Διαγραφή</span>
        </button>
      </div>
    </div>
  );
}

function DeletedState() {
  return (
    <div
      className="rounded-[12px] bg-white overflow-hidden flex flex-col items-center justify-between py-10 px-6 text-center"
      style={{ minHeight: 317 }}
    >
      <p className="text-xl font-bold text-[#27272A]">Επιτυχής διαγραφή</p>

      <div
        className="w-24 h-24 rounded-full flex items-center justify-center"
        style={{ backgroundColor: "#FFF2F1" }}
      >
        <TrashIcon color="#FE402B" />
      </div>

      <p className="text-base text-[#27272A] leading-snug">
        Η πρόταση έχει πλέον διαγραφεί από την πλατφόρμα και από το προφίλ σου
      </p>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────── */

export function OwnSuggestionCard(props: OwnSuggestionCardProps) {
  const [state, setState] = useState<CardState>("front");

  if (state === "deleted") return <DeletedState />;

  if (state === "confirming") {
    return (
      <ConfirmingState
        title={props.title}
        onCancel={() => setState("front")}
        onConfirm={() => setState("deleted")}
      />
    );
  }

  return <FrontState {...props} onDeleteTap={() => setState("confirming")} />;
}
