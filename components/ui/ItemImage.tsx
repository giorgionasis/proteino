"use client";

import type { CSSProperties, ReactNode } from "react";
import { FadeImage } from "@/components/ui/FadeImage";
import { mainImageSource } from "@/lib/item-images";
import { cn } from "@/lib/utils/cn";

/**
 * Item cover for every surface ("store whole, crop on display").
 *
 * The stored image is uncropped (images.main, see lib/item-image-upload.ts
 * → storeMainImage). Each surface decides its own shape through `ratio`;
 * the crop happens in CSS around the auto-detected focal point, and
 * `sizes` lets the browser pick the smallest width that fills the box
 * (phones get 320/640w, desktop 960/1280w).
 *
 *   <ItemImage images={item.images} fallbackUrl={item.cover_url}
 *              alt={item.title} ratio="2/3" sizes="(min-width: 1024px) 200px, 40vw" />
 *
 * mode="whole" shows the entire image over a blurred, dimmed copy of
 * itself — portrait posters in landscape heroes are never stretched.
 *
 * Plain <img> on purpose: variants are pre-sized, so next/image's
 * optimizer would only add cost.
 */
interface ItemImageProps {
  images: unknown;
  fallbackUrl?: string | null;
  alt: string;
  /** CSS aspect-ratio of the box, e.g. "2/3", "3/2", "16/9". Omit when the parent sizes the box. */
  ratio?: string;
  /** <img sizes>, e.g. "(min-width: 1024px) 240px, 45vw". */
  sizes: string;
  mode?: "crop" | "whole";
  /** Above-the-fold images: eager load + high fetch priority. */
  priority?: boolean;
  className?: string;
  /** Rendered when the item has no usable image. */
  placeholder?: ReactNode;
}

export function ItemImage({
  images,
  fallbackUrl,
  alt,
  ratio,
  sizes,
  mode = "crop",
  priority = false,
  className,
  placeholder,
}: ItemImageProps) {
  const source = mainImageSource(images, fallbackUrl);
  const box: CSSProperties = ratio ? { aspectRatio: ratio } : {};

  if (!source) {
    return (
      <div className={cn("relative overflow-hidden bg-zinc-100", className)} style={box}>
        {placeholder}
      </div>
    );
  }

  const imgProps = {
    src: source.src,
    srcSet: source.srcSet,
    sizes: source.srcSet ? sizes : undefined,
    loading: priority ? ("eager" as const) : ("lazy" as const),
    fetchPriority: priority ? ("high" as const) : undefined,
    decoding: "async" as const,
  };

  return (
    <div className={cn("relative overflow-hidden bg-zinc-100", className)} style={box}>
      {mode === "whole" && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          {...imgProps}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-75"
        />
      )}
      <FadeImage
        {...imgProps}
        alt={alt}
        className={cn("absolute inset-0 h-full w-full", mode === "whole" ? "object-contain" : "object-cover")}
        style={mode === "crop" ? { objectPosition: source.objectPosition } : undefined}
      />
    </div>
  );
}
