import { LeaderboardPage } from "@/components/leaderboard/LeaderboardPage";
import { getNavPublishedCategories } from "@/lib/categories-meta";

export default async function Leaderboard() {
  const cats = await getNavPublishedCategories();
  return (
    <LeaderboardPage
      categories={cats.map((c) => ({ slug: c.slug, labelEl: c.labelEl }))}
    />
  );
}
