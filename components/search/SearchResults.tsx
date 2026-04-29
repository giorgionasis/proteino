import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Item } from "@/types";
import { CATEGORIES } from "@/constants/categories";
import Link from "next/link";
import Image from "next/image";

interface SearchResultsProps {
  items: Item[];
  query: string;
}

export function SearchResults({ items, query }: SearchResultsProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-gray-500 text-sm">
          Δεν βρέθηκαν αποτελέσματα για <span className="font-medium">"{query}"</span>.
          <br />Εμφανίζω καλύτερες εναλλακτικές.
        </p>
        <Link href="/submit" className="inline-flex items-center text-coral-600 text-sm">
          Πρόσθεσε το πρώτος →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const cat = CATEGORIES.find((c) => c.slug === item.category);
        return (
          <Link key={item.id} href={`/${item.category}/${item.id}`}>
            <Card pressable className="flex gap-3 p-3">
              {item.cover_url && (
                <div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden">
                  <Image src={item.cover_url} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0 py-1">
                <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                {cat && <Badge variant="coral" className="mt-1">{cat.labelEl}</Badge>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-gray-400">★ {item.avg_rating.toFixed(1)}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{item.suggestion_count} προτάσεις</span>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
