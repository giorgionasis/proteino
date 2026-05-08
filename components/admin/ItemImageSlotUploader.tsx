"use client";

import { useRef, useState } from "react";
import type { ImageSlot, ItemImagesShape } from "@/lib/item-images";

/**
 * Single-slot uploader for item images. Handles client-side validation,
 * hits POST /api/admin/upload-item-image, shows progress + errors, and
 * displays the resulting variants.
 *
 * Server pipeline generates 4 variants (s/m/l/xl) + an OG image; this
 * component cares only about the user-facing flow: pick a file → see
 * the result rendered.
 */
interface Props {
  itemId: string;
  slot: ImageSlot;
  /** Current images.{slot} variants; rendered when present. */
  current?: { s?: string; m?: string; l?: string; xl?: string } | null;
  /** Called with the full updated images jsonb after a successful upload. */
  onUploaded: (images: ItemImagesShape) => void;
}

const LABELS: Record<ImageSlot, { title: string; subtitle: string; aspect: string }> = {
  poster: {
    title: "Poster",
    subtitle: "2:3 portrait — generates s/m/l/xl WebP variants",
    aspect: "2 / 3",
  },
  backdrop: {
    title: "Backdrop",
    subtitle: "16:9 landscape — generates s/m/l/xl WebP variants + OG",
    aspect: "16 / 9",
  },
};

export function ItemImageSlotUploader({ itemId, slot, current, onUploaded }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const meta = LABELS[slot];
  const previewUrl = current?.l ?? current?.m ?? current?.xl ?? current?.s ?? null;

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);
    setProgress("Uploading…");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("itemId", itemId);
      fd.append("slot", slot);

      setProgress("Processing variants on server…");
      const res = await fetch("/api/admin/upload-item-image", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `Upload failed (HTTP ${res.status})`);
      }

      setProgress(null);
      onUploaded(json.images as ItemImagesShape);
    } catch (err: any) {
      setError(err?.message ?? "Upload failed");
      setProgress(null);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="border border-zinc-200 rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">{meta.title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div
          className="shrink-0 rounded-md overflow-hidden bg-zinc-100 border border-zinc-200 flex items-center justify-center"
          style={{ width: 120, aspectRatio: meta.aspect }}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={`${meta.title} preview`} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-zinc-400 text-center px-1">No image</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <label
            className={`inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm font-semibold cursor-pointer transition-colors ${
              busy ? "bg-zinc-200 text-zinc-500 cursor-not-allowed" : "bg-zinc-900 text-white hover:bg-zinc-700"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handlePick}
              disabled={busy}
            />
            {previewUrl ? "Replace" : "Upload"}
          </label>

          {progress && (
            <p className="text-xs text-zinc-500 mt-2">{progress}</p>
          )}
          {error && (
            <p className="text-xs text-red-600 mt-2">{error}</p>
          )}
          {current && previewUrl && !busy && (
            <div className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
              <div>Variants:{" "}
                {(["s","m","l","xl"] as const).map((v) => (
                  <span key={v} className={current[v] ? "text-zinc-700 font-mono mr-2" : "text-zinc-300 line-through font-mono mr-2"}>
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
