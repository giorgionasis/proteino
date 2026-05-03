"use client";

import { useState } from "react";
import Image from "next/image";

/* ── Types ────────────────────────────────────────────────────── */

type CardState = "front" | "confirming" | "removed";

interface BookmarkedCardProps {
  id: string;
  imageSrc: string;
  avatarSrc: string;
  title: string;
  rating: number;
  reviewCount: number;
}

/* ── Front ────────────────────────────────────────────────────── */

function FrontState({
  imageSrc,
  avatarSrc,
  title,
  rating,
  reviewCount,
  onRemoveTap,
}: BookmarkedCardProps & { onRemoveTap: () => void }) {
  return (
    <div className="flex flex-col gap-4 bg-white rounded-[12px]">
      {/* Image container */}
      <div className="relative w-full rounded-[12px] overflow-hidden" style={{ height: 227 }}>
        <Image src={imageSrc} alt={title} fill className="object-cover" />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0 rounded-[12px]"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0) 69%, rgba(0,0,0,0.33) 100%)" }}
        />
        {/* Floating avatar */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{ left: 16, top: 162, width: 50, height: 50, border: "2px solid #F4F4F5" }}
        >
          <Image src={avatarSrc} alt="" fill className="object-cover" />
        </div>
      </div>

      {/* Info + action */}
      <div className="flex flex-col gap-5">
        {/* Title + rating */}
        <div className="flex items-center justify-between">
          <span className="text-[18px] font-bold text-[#18181B] leading-none">{title}</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden>
                <path d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z" fill="#27272A" />
              </svg>
              <span className="text-base font-semibold text-[#27272A]">{rating.toFixed(2)}</span>
            </div>
            <span className="text-base font-medium text-[#27272A]">({reviewCount})</span>
          </div>
        </div>

        {/* Αφαίρεση button */}
        <button
          onClick={onRemoveTap}
          className="w-full flex items-center justify-center gap-2 rounded-[8px] active:opacity-70 transition-opacity"
          style={{ backgroundColor: "#FFF2F1", height: 48 }}
        >
          <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden>
            <path d="M1 3.5h10M4 3.5V2h4v1.5M4.5 5.5v5M7.5 5.5v5M2 3.5l.5 7.5a1 1 0 001 1h5a1 1 0 001-1L10 3.5H2z" stroke="#3F3F46" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-sm font-semibold text-[#3F3F46]">Αφαίρεση</span>
        </button>
      </div>
    </div>
  );
}

/* ── Confirming ───────────────────────────────────────────────── */

function ConfirmingState({
  title,
  onCancel,
  onConfirm,
}: { title: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="flex flex-col bg-white rounded-[12px]">
      {/* Icon + texts */}
      <div className="flex flex-col gap-4 px-6 pt-10 pb-0">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path d="M4 8h24M10 8V5.5A1.5 1.5 0 0111.5 4h9A1.5 1.5 0 0122 5.5V8M13 13v10M19 13v10M6 8l1 18a2 2 0 002 2h14a2 2 0 002-2l1-18H6z" stroke="#27272A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p className="text-[22px] font-bold text-[#27272A] leading-[120%]">Διαγραφή Πρότασης</p>
        <p className="text-base font-semibold text-[#71717A] leading-[120%]">{title}</p>
      </div>

      {/* Description */}
      <div className="px-6 pt-6 pb-8">
        <p className="text-sm font-medium text-[#27272A] leading-snug">
          Η πρότασή σου θα αφαιρεθεί από το προφίλ σου και δεν θα είναι ορατή σε κανέναν
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 px-5 py-3.5 bg-[#FAFAFA] rounded-b-[12px]">
        <button
          onClick={onCancel}
          className="flex items-center justify-center rounded-full active:opacity-70 transition-opacity"
          style={{ width: 90, padding: "12px" }}
        >
          <span className="text-sm font-semibold text-[#27272A]">Άκυρο</span>
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center justify-center rounded-[4px] active:opacity-70 transition-opacity"
          style={{ backgroundColor: "#FE402B", padding: "12px" }}
        >
          <span className="text-sm font-bold text-white">Διαγραφή</span>
        </button>
      </div>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────── */

export function BookmarkedCard(props: BookmarkedCardProps) {
  const [state, setState] = useState<CardState>("front");

  if (state === "removed") return null;

  if (state === "confirming") {
    return (
      <ConfirmingState
        title={props.title}
        onCancel={() => setState("front")}
        onConfirm={() => setState("removed")}
      />
    );
  }

  return <FrontState {...props} onRemoveTap={() => setState("confirming")} />;
}
