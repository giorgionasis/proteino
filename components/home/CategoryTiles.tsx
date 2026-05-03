"use client";

import Link from "next/link";
import { CATEGORIES } from "@/constants/categories";

interface CategoryTilesProps {
  className?: string;
}

export function CategoryTiles({ className }: CategoryTilesProps) {
  return (
    <section className={className}>
      <div className="flex flex-col gap-12">
        {chunk(CATEGORIES, 3).map((row, ri) => (
          <div key={ri} className="flex justify-between px-5">
            {row.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="flex flex-col items-center gap-4 active:opacity-75 transition-opacity"
                style={{ width: 112 }}
              >
                <div
                  className="w-[90px] h-[90px] rounded-full overflow-hidden flex items-center justify-center text-3xl"
                  style={{ backgroundColor: TILE_COLORS[cat.slug] ?? "#d4d4d8" }}
                >
                  {cat.icon}
                </div>
                <p className="text-base font-bold text-zinc-800 text-center leading-[21.64px]">
                  {cat.labelEl.toUpperCase()}
                </p>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

const TILE_COLORS: Record<string, string> = {
  movies:  "#3730a3",
  series:  "#1e3a8a",
  books:   "#064e3b",
  food:    "#9a3412",
  recipes: "#14532d",
  bars:    "#78350f",
  hotels:  "#0c4a6e",
  theater: "#881337",
  events:  "#4c1d95",
};

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}
