import type { Metadata } from "next";
import { BookmarksCategoryPage } from "@/components/profile/bookmarks/BookmarksCategoryPage";

interface Props { params: { handle: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Αγαπημένα @${params.handle} — Proteino` };
}

export default function BookmarksPage({ params }: Props) {
  return <BookmarksCategoryPage handle={params.handle} category="vivlia" />;
}
