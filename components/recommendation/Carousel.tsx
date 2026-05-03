import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import type { Item } from "@/types";
import { CATEGORIES } from "@/constants/categories";

interface CarouselProps {
  title: string;
  items: Item[];
  seeAllHref?: string;
}

export function Carousel({ title, items, seeAllHref }: CarouselProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-4">
        <h2 className="text-sm font-medium text-gray-900">{title}</h2>
        {seeAllHref && (
          <Link href={seeAllHref} className="text-xs text-coral-600">
            Δες όλα
          </Link>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {items.map((item) => (
          <Link key={item.id} href={`/${item.category}/${item.id}`} className="flex-shrink-0">
            <Card className="w-32">
              <div className="relative w-32 h-44 bg-gray-100">
                {item.cover_url ? (
                  <Image src={item.cover_url} alt={item.title} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {CATEGORIES.find((c) => c.slug === item.category)?.icon ?? "⭐"}
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">★ {item.avg_rating.toFixed(1)}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
