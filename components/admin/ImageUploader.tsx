"use client";

/**
 * Reusable image uploader.
 *
 * Drop-in replacement for "<input type=url>" for image fields.
 * - Drag-drop or click-to-upload
 * - Live preview (existing or just-uploaded)
 * - Inline errors (size, type, network)
 * - Optional manual URL paste fallback (advanced)
 *
 * Usage:
 *   <ImageUploader prefix="collections" value={url} onChange={setUrl} />
 */

import { useRef, useState } from "react";

interface Props {
  /** Storage path prefix (e.g. "collections", "activities"). */
  prefix: string;
  /** Current image URL. */
  value: string;
  /** Called when URL changes (after upload, after clear, after paste). */
  onChange: (url: string) => void;
  /** Show a "paste URL instead" fallback for power users. */
  allowUrlPaste?: boolean;
  /** Visual aspect-ratio hint for the preview area. */
  aspectRatio?: "square" | "4/3" | "16/9" | "auto";
  className?: string;
}

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

export function ImageUploader({
  prefix,
  value,
  onChange,
  allowUrlPaste = false,
  aspectRatio = "auto",
  className = "",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("prefix", prefix);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Αποτυχία upload");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setUploading(false);
    }
  }

  function onPick() {
    fileInputRef.current?.click();
  }

  function onChangeFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so picking the same file again still triggers change
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function clear() {
    onChange("");
    setUrlDraft("");
    setShowUrlInput(false);
  }

  const aspectClass =
    aspectRatio === "square" ? "aspect-square" :
    aspectRatio === "4/3"   ? "aspect-[4/3]" :
    aspectRatio === "16/9"  ? "aspect-video" :
    "min-h-[140px]";

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        onChange={onChangeFile}
        className="hidden"
      />

      {value ? (
        // ── Has image: show preview + clear/replace controls ───────
        <div className="space-y-2">
          <div className={`relative rounded-xl bg-zinc-100 border border-zinc-200 overflow-hidden ${aspectClass}`}>
            <img src={value} alt="" className="w-full h-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-sm text-white">
                Φόρτωμα...
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPick}
              disabled={uploading}
              className="text-xs text-zinc-700 hover:text-zinc-900 underline disabled:opacity-40"
            >
              Αλλαγή
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={uploading}
              className="text-xs text-red-600 hover:text-red-700 underline disabled:opacity-40"
            >
              Αφαίρεση
            </button>
            {allowUrlPaste && (
              <button
                type="button"
                onClick={() => setShowUrlInput((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-700 ml-auto"
              >
                {showUrlInput ? "✕ ακύρωση" : "Επικόλληση URL"}
              </button>
            )}
          </div>
          {showUrlInput && (
            <UrlPaste
              value={urlDraft}
              onChange={setUrlDraft}
              onApply={() => { onChange(urlDraft.trim()); setShowUrlInput(false); }}
            />
          )}
        </div>
      ) : (
        // ── Empty: drop zone ──────────────────────────────────────
        <div className="space-y-2">
          <button
            type="button"
            onClick={onPick}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={uploading}
            className={`w-full ${aspectClass} flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-colors ${
              dragOver
                ? "border-coral-600 bg-coral-50"
                : uploading
                ? "border-zinc-300 bg-zinc-50"
                : "border-zinc-300 bg-zinc-50/50 hover:border-zinc-400 hover:bg-zinc-50"
            }`}
          >
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                <p className="text-sm text-zinc-600">Φόρτωμα...</p>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                <p className="text-sm text-zinc-600 font-medium">Σύρε εικόνα ή πάτησε για επιλογή</p>
                <p className="text-[11px] text-zinc-400">JPG, PNG, WebP, GIF, SVG · μέχρι 5MB</p>
              </>
            )}
          </button>

          {allowUrlPaste && (
            !showUrlInput ? (
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="text-xs text-zinc-500 hover:text-zinc-700"
              >
                ή Επικόλληση URL →
              </button>
            ) : (
              <UrlPaste
                value={urlDraft}
                onChange={setUrlDraft}
                onApply={() => { onChange(urlDraft.trim()); setShowUrlInput(false); }}
              />
            )
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}

function UrlPaste({ value, onChange, onApply }: {
  value: string; onChange: (v: string) => void; onApply: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), onApply())}
        placeholder="https://..."
        className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-400"
      />
      <button
        type="button"
        onClick={onApply}
        disabled={!value.trim()}
        className="px-3 py-2 text-xs font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 disabled:opacity-40"
      >
        Εφαρμογή
      </button>
    </div>
  );
}
