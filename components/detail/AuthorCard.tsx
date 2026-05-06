"use client";

import { useState } from "react";

interface AuthorCardProps {
  name: string;
  /** URL of author photo. Falls back to first-letter initial. */
  photoUrl?: string | null;
  /** Author's age — rendered as "52 ετών". */
  age?: number | null;
  /** Author's published book count — "17 βιβλία". */
  bookCount?: number | null;
  /** Bio text. Truncates at ~200 chars with "Περισσότερα" expand. */
  bio?: string | null;
}

const BIO_PREVIEW_LIMIT = 200;

/**
 * Author profile card shown at the bottom of book detail pages, after the
 * reviews carousel (engagement-first per Figma).
 *
 * Lavender background. Photo (76×76 rounded square) on the left, name + age
 * + book count on the right. Bio paragraph below with expand-on-click.
 */
export function AuthorCard({ name, photoUrl, age, bookCount, bio }: AuthorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isLongBio = !!bio && bio.length > BIO_PREVIEW_LIMIT;
  const displayBio = !bio
    ? null
    : expanded || !isLongBio
      ? bio
      : bio.slice(0, BIO_PREVIEW_LIMIT) + "…";

  return (
    <div className="rounded-[12px] p-5" style={{ backgroundColor: "#EFF1FA" }}>
      <div className="flex items-center gap-4">
        <div className="w-[76px] h-[76px] rounded-[12px] shrink-0 overflow-hidden bg-zinc-300 flex items-center justify-center">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-zinc-500 text-xl font-bold">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-[20px] font-bold text-zinc-900 leading-tight line-clamp-2">{name}</p>
          {(age != null || bookCount != null) && (
            <div className="flex items-center gap-3 text-[14px] text-zinc-700">
              {age != null && (
                <span>
                  <span className="font-bold text-zinc-900">{age}</span> ετών
                </span>
              )}
              {bookCount != null && (
                <span>
                  <span className="font-bold text-zinc-900">{bookCount}</span> βιβλία
                </span>
              )}
            </div>
          )}
          {age == null && bookCount == null && (
            <p className="text-[13px] font-medium text-zinc-500">Συγγραφέας</p>
          )}
        </div>
      </div>

      {displayBio && (
        <div className="mt-4 space-y-3">
          <p className="text-[14px] font-normal text-zinc-700 leading-[150%]">{displayBio}</p>
          {isLongBio && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[14px] font-bold text-zinc-800 underline underline-offset-2"
            >
              {expanded ? "Λιγότερα" : "Περισσότερα"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
