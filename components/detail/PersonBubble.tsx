"use client";

import { AvatarImage } from "@/components/ui/AvatarImage";
import { cn } from "@/lib/utils/cn";

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  layout?: "stack" | "inline";
  stackWidth?: number;
  uppercase?: boolean;
  textSize?: number;
}

export function PersonBubble({
  name,
  avatarUrl,
  size = 50,
  layout = "stack",
  stackWidth,
  uppercase,
  textSize,
}: Props) {
  const avatar = (
    <div
      className="rounded-full overflow-hidden shrink-0"
      style={{ width: size, height: size }}
    >
      <AvatarImage url={avatarUrl} name={name} size={size} />
    </div>
  );

  if (layout === "inline") {
    return (
      <div className="flex items-center gap-3">
        {avatar}
        <p
          className={cn("font-bold text-zinc-900 leading-[140%]", uppercase && "uppercase")}
          style={{ fontSize: textSize ?? 18 }}
        >
          {name}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex-none flex flex-col items-center gap-3"
      style={{ width: stackWidth ?? size + 22 }}
    >
      {avatar}
      <p
        className={cn(
          "font-semibold text-zinc-900 text-center leading-tight",
          uppercase && "uppercase",
        )}
        style={{ fontSize: textSize ?? 12 }}
      >
        {name}
      </p>
    </div>
  );
}
