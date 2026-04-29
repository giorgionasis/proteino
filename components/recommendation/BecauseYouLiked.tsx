import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import type { Item } from "@/types";

interface BecauseYouLikedProps {
  because: Item;
  recommendations: Item[];
}

export function BecauseYouLiked({ because, recommendations }: BecauseYouLikedProps) {
  return (
    <section className="space-y-3">
      <div className="px-4">
        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Επειδή σου άρεσε</p>
        <h2 className="text-sm font-medium text-gray-900">{because.title}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 pb-1">
        {recommendations.map((item) => (
          <Link key={item.id} href={`/${item.category}/${item.id}`} className="flex-shrink-0">
            <Card className="w-32">
              <div className="relative w-32 h-44 bg-gray-100">
                {item.cover_url && (
                  <Image src={item.cover_url} alt={item.title} fill className="object-cover" />
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium text-gray-900 line-clamp-2">{item.title}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
