"use client";

/**
 * Multi-image gallery editor — for venue categories (food/bars/hotels).
 *
 * Wraps multiple <ImageUploader> instances. Supports tab grouping (Δωμάτια /
 * Κοινόχρηστοι / Εξωτερικά), drag-reorder via ▲▼ arrows, alt text, and
 * delete. Stores a flat array of { url, alt?, tab? }.
 */

import { useMemo, useState } from "react";
import { ImageUploader } from "./ImageUploader";

export interface GalleryImage {
  url: string;
  alt?: string;
  tab?: string;
}

interface Props {
  prefix: string;                // "items-food", "items-bars", "items-hotels"
  tabs: string[];                // ["Δωμάτια", "Κοινόχρηστοι", "Εξωτερικά"]
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
}

export function ImageGallery({ prefix, tabs, images, onChange }: Props) {
  const [activeTab, setActiveTab] = useState(tabs[0] ?? "");
  const [draftAlt, setDraftAlt] = useState<Record<number, string>>({});

  const tabImages = useMemo(
    () => images
      .map((img, idx) => ({ img, idx }))
      .filter(({ img }) => (img.tab ?? tabs[0]) === activeTab),
    [images, activeTab, tabs]
  );

  function addImage(url: string) {
    const next = [...images, { url, tab: activeTab }];
    onChange(next);
  }

  function removeAt(globalIdx: number) {
    const next = images.filter((_, i) => i !== globalIdx);
    onChange(next);
  }

  function setAltAt(globalIdx: number, alt: string) {
    const next = images.map((img, i) => (i === globalIdx ? { ...img, alt } : img));
    onChange(next);
  }

  function moveWithinTab(currentTabIdx: number, dir: -1 | 1) {
    const arr = [...tabImages];
    const next = currentTabIdx + dir;
    if (next < 0 || next >= arr.length) return;
    [arr[currentTabIdx], arr[next]] = [arr[next], arr[currentTabIdx]];

    // Rebuild full images array with new order for THIS tab; preserve other tabs intact
    const orderedGlobalIdxs = new Set(arr.map(({ idx }) => idx));
    const otherImages = images.filter((_, i) => !orderedGlobalIdxs.has(i));
    const reorderedTab = arr.map(({ img }) => img);
    onChange([...reorderedTab, ...otherImages]);
  }

  return (
    <div>
      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-zinc-200 mb-4">
          {tabs.map((tab) => {
            const count = images.filter((img) => (img.tab ?? tabs[0]) === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === tab
                    ? "text-zinc-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab} {count > 0 && <span className="ml-1 text-xs text-zinc-400">({count})</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {tabImages.map(({ img, idx }, i) => (
          <div key={`${idx}-${img.url}`} className="border border-zinc-200 rounded-lg p-2">
            <div className="relative aspect-[4/3] bg-zinc-100 rounded overflow-hidden mb-2">
              <img src={img.url} alt={img.alt ?? ""} className="w-full h-full object-cover" />
              {i === 0 && tabs.length === 1 && (
                <span className="absolute top-1 left-1 bg-zinc-900/85 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  PRIMARY
                </span>
              )}
            </div>
            <input
              type="text"
              defaultValue={img.alt ?? ""}
              onChange={(e) => setDraftAlt((p) => ({ ...p, [idx]: e.target.value }))}
              onBlur={() => {
                const v = draftAlt[idx];
                if (v !== undefined && v !== (img.alt ?? "")) setAltAt(idx, v);
              }}
              placeholder="Alt text (προαιρετικό)"
              className="w-full px-2 py-1 text-xs border border-zinc-200 rounded focus:outline-none focus:border-zinc-400 mb-1.5"
            />
            <div className="flex items-center justify-between text-xs">
              <div className="flex gap-0.5">
                <button onClick={() => moveWithinTab(i, -1)} disabled={i === 0} className="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 rounded disabled:opacity-30">▲</button>
                <button onClick={() => moveWithinTab(i, +1)} disabled={i === tabImages.length - 1} className="px-1.5 py-0.5 text-zinc-500 hover:bg-zinc-100 rounded disabled:opacity-30">▼</button>
              </div>
              <button onClick={() => removeAt(idx)} className="text-red-500 hover:text-red-700">Αφαίρεση</button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-sm">
        <ImageUploader
          prefix={prefix}
          value=""
          onChange={(url) => url && addImage(url)}
          aspectRatio="4/3"
        />
        <p className="text-xs text-zinc-400 mt-2">
          Πρόσθεσε εικόνα στο tab <strong>{activeTab}</strong>. Πρώτη εικόνα = κύρια.
        </p>
      </div>
    </div>
  );
}
