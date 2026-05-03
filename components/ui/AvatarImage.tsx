"use client";

import { useState } from "react";

interface Props {
  url?:       string | null;
  name?:      string | null;
  size?:      number;
  className?: string;
}

const PALETTE = [
  "#FF6B6B","#FF9F43","#FECA57","#48DBFB","#FF9FF3",
  "#54A0FF","#5F27CD","#00D2D3","#1DD1A1","#576574",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffff;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

export function AvatarImage({ url, name, size = 80, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const label = name?.trim() || "?";
  const bg    = pickColor(label);
  const fs    = Math.round(size * 0.36);

  if (url && !failed) {
    // Upgrade Google profile photo size for sharper display
    const src = url.match(/lh3\.googleusercontent\.com/)
      ? url.replace(/=s\d+-c$/, "=s400-c")
      : url;
    return (
      <img
        src={src}
        alt={name ?? ""}
        referrerPolicy="no-referrer"
        className={`object-cover ${className}`}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={name ?? undefined}
      className={`flex items-center justify-center font-bold text-white select-none ${className}`}
      style={{ width: size, height: size, backgroundColor: bg, fontSize: fs, lineHeight: 1 }}
    >
      {initials(label)}
    </div>
  );
}
