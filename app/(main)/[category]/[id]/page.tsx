import type { Metadata } from "next";

interface Props {
  params: { category: string; id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Proteino` }; // Filled in after item fetch
}

export default function ItemDetailPage({ params }: Props) {
  return (
    <main className="pb-24">
      {/* Hero */}
      {/* Quick actions */}
      {/* Metadata grid */}
      {/* Rating breakdown */}
      {/* Community suggestions */}
      {/* Related items carousel */}
    </main>
  );
}
