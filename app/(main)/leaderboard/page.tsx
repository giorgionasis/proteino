import type { Metadata } from "next";
import { LeaderboardPage } from "@/components/leaderboard/LeaderboardPage";
import { getNavPublishedCategories } from "@/lib/categories-meta";

export const metadata: Metadata = {
  title: "Κατάταξη",
  description: "Τα μέλη του Proteino με τις περισσότερες προτάσεις, συνολικά και ανά κατηγορία.",
  alternates: { canonical: "/leaderboard" },
};

export default async function Leaderboard() {
  const cats = await getNavPublishedCategories();
  return (
    <LeaderboardPage
      categories={cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl }))}
    />
  );
}
