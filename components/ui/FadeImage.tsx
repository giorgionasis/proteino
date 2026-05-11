"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Image wrapper that fades from 0 → 1 opacity once the image actually
 * loads. Replaces the "snap-in" feel of network-loaded covers/avatars
 * across the site. The container reserves the visual space, so layout
 * doesn't shift — only the pixels themselves animate in.
 *
 * Drop-in replacement for `<img>` in cases where the surrounding
 * element controls dimensions. Pass `className` for the <img>; wrap
 * positioning concerns at the parent level.
 */
type Props = ImgHTMLAttributes<HTMLImageElement>;

export function FadeImage({ className, onLoad, ...props }: Props) {
  const [loaded, setLoaded] = useState(false);
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      {...props}
      onLoad={(e) => { setLoaded(true); onLoad?.(e); }}
      className={cn(
        "transition-opacity duration-300 ease-soft",
        loaded ? "opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
