"use client";

import Link from "next/link";

interface Group {
  slug: string;
  label: string;
  count: number;
  covers: string[];
  overflow: number;
}

interface Props {
  handle: string;
  groups: Group[];
  total: number;
}

function CategoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="11" stroke="#27272A" strokeWidth="1.5" />
      <path
        d="M8 7h8v10l-4-3-4 3V7z"
        stroke="#27272A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StackedCovers({ covers, overflow }: { covers: string[]; overflow: number }) {
  if (covers.length === 0 && overflow === 0) return null;
  return (
    <div className="flex items-center">
      {covers.map((src, i) => (
        <div
          key={i}
          className="w-[50px] h-[50px] rounded-full overflow-hidden shrink-0 bg-zinc-100"
          style={{
            marginLeft: i === 0 ? 0 : -10,
            border: "2px solid #FFFFFF",
            zIndex: i,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-[50px] h-[50px] rounded-full shrink-0 flex items-center justify-center"
          style={{
            marginLeft: covers.length > 0 ? -10 : 0,
            backgroundColor: "#3F3F46",
            border: "2px solid #FFFFFF",
            zIndex: covers.length,
          }}
        >
          <span className="text-sm font-semibold text-[#FAFAFA]">+{overflow}</span>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ group, handle }: { group: Group; handle: string }) {
  return (
    <Link
      href={`/profile/${handle}/suggestions/${group.slug}`}
      className="flex flex-col gap-5 py-5 px-3 active:bg-zinc-50 transition-colors"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-3">
          <span className="text-[24px] font-bold text-[#27272A] leading-[130%]">{group.label}</span>
          <span className="text-base font-semibold text-[#52525B] leading-[130%]">
            {group.count} {group.count === 1 ? "πρόταση" : "προτάσεις"}
          </span>
        </div>
        <CategoryIcon />
      </div>
      <StackedCovers covers={group.covers} overflow={group.overflow} />
    </Link>
  );
}

function EmptyState({ handle }: { handle: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <p className="text-5xl mb-4">📭</p>
      <h2 className="text-lg font-bold text-zinc-800 mb-1">Καμία πρόταση ακόμα</h2>
      <p className="text-sm text-zinc-500 leading-relaxed mb-6">
        Όταν ο/η <span className="font-semibold">@{handle}</span> προτείνει κάτι, θα εμφανιστεί εδώ.
      </p>
    </div>
  );
}

export function SuggestionsCategoryList({ handle, groups, total }: Props) {
  if (groups.length === 0) return <EmptyState handle={handle} />;

  return (
    <div className="bg-white">
      <div className="mx-6 mt-6 mb-2">
        <div
          className="flex items-center gap-2.5 rounded-[8px] px-4 py-4"
          style={{ backgroundColor: "#F2F2F7" }}
        >
          <span
            className="font-bold text-[#27272A] leading-none"
            style={{ fontSize: 52, lineHeight: "37px" }}
          >
            {total}
          </span>
          <span className="text-base text-[#3F3F46] leading-snug" style={{ fontWeight: 500 }}>
            προτάσεις σε <strong className="font-bold">{groups.length} {groups.length === 1 ? "κατηγορία" : "κατηγορίες"}</strong>
          </span>
        </div>
      </div>

      <div className="mx-6 flex flex-col divide-y divide-[#E4E4E7]">
        {groups.map((g) => (
          <CategoryRow key={g.slug} group={g} handle={handle} />
        ))}
      </div>
    </div>
  );
}
