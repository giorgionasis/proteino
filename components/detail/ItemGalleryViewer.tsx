"use client";

/**
 * Read-only gallery viewer for venue detail pages.
 *
 * Renders the items.images jsonb array as a horizontal scroll strip, with
 * optional tab grouping (matches the admin's tab structure). Tap an image
 * to open a fullscreen lightbox.
 *
 * Returns null when there are no images — never an empty section.
 */

import { useEffect, useState } from "react";

export interface GalleryImage {
  url: string;
  alt?: string;
  tab?: string;
}

interface Props {
  images: GalleryImage[];
  tabs?: string[];     // if present, group images by tab
}

export function ItemGalleryViewer({ images, tabs }: Props) {
  const usable = images.filter((img) => !!img?.url);
  const [activeTab, setActiveTab] = useState<string>(tabs?.[0] ?? "");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (usable.length === 0) return null;

  const showTabs = !!tabs && tabs.length > 1 && usable.some((img) => img.tab);
  const visible = showTabs
    ? usable.filter((img) => (img.tab ?? tabs![0]) === activeTab)
    : usable;

  return (
    <section className="space-y-3">
      {showTabs && (
        <div className="flex gap-1.5 overflow-x-auto px-6 no-scrollbar">
          {tabs!.map((t) => {
            const count = usable.filter((img) => (img.tab ?? tabs![0]) === t).length;
            const active = activeTab === t;
            return (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
                disabled={count === 0}
              >
                {t} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar pl-6 pr-6">
        {visible.map((img, i) => (
          <button
            key={`${img.url}-${i}`}
            onClick={() => setLightboxIdx(usable.indexOf(img))}
            className="flex-none w-[160px] h-[200px] rounded-xl overflow-hidden bg-zinc-100 active:opacity-80 transition-opacity"
          >
            <img
              src={img.url}
              alt={img.alt ?? ""}
              className="w-full h-full object-cover"
              loading={i < 3 ? "eager" : "lazy"}
            />
          </button>
        ))}
      </div>

      {lightboxIdx !== null && (
        <Lightbox
          images={usable}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i! - 1 + usable.length) % usable.length)}
          onNext={() => setLightboxIdx((i) => (i! + 1) % usable.length)}
        />
      )}
    </section>
  );
}

function Lightbox({ images, index, onClose, onPrev, onNext }: {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const img = images[index];

  // Close on Escape; arrow keys navigate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Κλείσιμο"
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-2xl leading-none hover:bg-white/20"
      >×</button>

      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="Προηγούμενο"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >‹</button>

      <img
        src={img.url}
        alt={img.alt ?? ""}
        className="max-w-[92vw] max-h-[80vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label="Επόμενο"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >›</button>

      <div className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}
