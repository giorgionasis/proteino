/**
 * <Icon /> — single rendering primitive for static icons in `public/icons/`.
 *
 * Use everywhere (frontend + admin):
 *
 *   import { Icon } from "@/components/ui/Icon";
 *   <Icon name="vegan" size={48} />
 *   <Icon name="amenity-wifi" size={32} className="text-zinc-700" />
 *   <Icon name="booking-wordmark" width={140} height={32} alt="Booking.com" />
 *
 * Names registered in `lib/icons.ts`. To add a new icon: drop the SVG into
 * `public/icons/<category>/`, add an entry there, you're done.
 *
 * Plain <img> is intentional — these are tiny static assets (most <5KB),
 * skipping next/image's optimizer keeps next.config.js free of
 * `dangerouslyAllowSVG` and avoids the rasterization that would defeat
 * sharpness on the line-art icons.
 */
import { ICON_PATHS, type IconName } from "@/lib/icons";

interface IconProps {
  name: IconName;
  /** Shorthand: sets both width and height. Defaults to 24. */
  size?: number;
  width?: number;
  height?: number;
  /** Empty string by default — assume decorative unless caller specifies. */
  alt?: string;
  className?: string;
  /** Set to true if the icon conveys meaning (otherwise it's hidden from AT). */
  decorative?: boolean;
}

export function Icon({
  name,
  size,
  width,
  height,
  alt = "",
  className,
  decorative,
}: IconProps) {
  const w = width ?? size ?? 24;
  const h = height ?? size ?? 24;
  const ariaHidden = decorative === false ? undefined : alt === "" ? true : undefined;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={ICON_PATHS[name]}
      alt={alt}
      width={w}
      height={h}
      className={className}
      aria-hidden={ariaHidden}
      draggable={false}
    />
  );
}
