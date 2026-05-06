import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { CATEGORIES } from "@/constants/categories";
import { InnerHeader } from "@/components/layout/Header";
import { ReviewCard } from "@/components/detail/ReviewCard";

interface Props {
  params: { category: string; id: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const sb = createAdminClient();
  const slug = `${params.category}/${params.id}`;
  const { data: item } = (await sb
    .from("items")
    .select("title")
    .eq("slug", slug)
    .maybeSingle()) as { data: { title: string } | null };
  return { title: item?.title ? `Αξιολογήσεις · ${item.title}` : "Αξιολογήσεις" };
}

function badgeForLevel(level: number): "Verified" | "Expert" | "Gold" | "Platinum" {
  if (level >= 50) return "Platinum";
  if (level >= 25) return "Gold";
  if (level >= 10) return "Expert";
  return "Verified";
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return "σήμερα";
  if (days < 2) return "χθες";
  if (days < 7) return `${days} ημέρες πριν`;
  if (days < 30) return `${Math.floor(days / 7)} εβδομάδες πριν`;
  if (days < 365) return `${Math.floor(days / 30)} μήνες πριν`;
  return `${Math.floor(days / 365)} χρόνια πριν`;
}

function StarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 12) / 13} viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M6.5 1L8.04 4.26L11.75 4.72L9.13 7.24L9.81 10.94L6.5 9.14L3.19 10.94L3.87 7.24L1.25 4.72L4.96 4.26L6.5 1Z"
        fill="#27272A"
      />
    </svg>
  );
}

export default async function ItemReviewsPage({ params }: Props) {
  const cat = CATEGORIES.find((c) => c.slug === params.category);
  if (!cat) notFound();

  const sb = createAdminClient();
  const slug = `${params.category}/${params.id}`;

  const { data: item } = (await sb
    .from("items")
    .select("id, title, slug, rating_count, avg_rating")
    .eq("slug", slug)
    .maybeSingle()) as {
    data: { id: string; title: string; slug: string; rating_count: number | null; avg_rating: number | null } | null;
  };

  if (!item) notFound();

  // Reviews live in the dedicated `reviews` table (post migration 016).
  // Each row = one user's rating (mandatory) + optional reflection.
  const { data: reviewRows } = await sb
    .from("reviews")
    .select(
      "id, rating, reflection, created_at, vote_up, vote_down, users!reviews_user_id_fkey(id, display_name, handle, avatar_url, level)"
    )
    .eq("item_id", item.id)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });

  const reviewsRaw = ((reviewRows ?? []) as any[]).filter((r) => r.users);

  // Per-viewer vote state — same approach as the detail page server fetch.
  const myVoteByReview = new Map<string, 1 | -1>();
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user && reviewsRaw.length > 0) {
      const reviewIds = reviewsRaw.map((r: any) => r.id);
      const { data: voteRows } = await sb
        .from("review_votes")
        .select("review_id, vote")
        .eq("user_id", user.id)
        .in("review_id", reviewIds);
      for (const v of (voteRows ?? []) as Array<{ review_id: string; vote: number }>) {
        if (v.vote === 1 || v.vote === -1) myVoteByReview.set(v.review_id, v.vote as 1 | -1);
      }
    }
  } catch { /* guest or network */ }

  const reviews = reviewsRaw;
  const aggregateAvg = item.avg_rating ?? 0;

  return (
    <>
      <InnerHeader title="Αξιολογήσεις" />

      <div className="px-6 pt-4 pb-2">
        <Link
          href={`/${item.slug}`}
          className="text-[13px] font-medium text-zinc-500 active:text-zinc-700"
        >
          ← {item.title}
        </Link>
        <div className="flex items-center gap-2 mt-3">
          <StarIcon size={18} />
          <span className="text-[18px] font-bold text-zinc-800">{aggregateAvg.toFixed(2)}</span>
          <span className="text-[13px] font-medium text-zinc-600">
            · {reviews.length} {reviews.length === 1 ? "αξιολόγηση" : "αξιολογήσεις"}
          </span>
        </div>
      </div>

      <div className="px-6 mt-4 pb-12 flex flex-col gap-4">
        {reviews.length === 0 ? (
          <div className="rounded-[12px] bg-zinc-50 p-8 text-center">
            <p className="text-[15px] font-semibold text-zinc-800">Καμία αξιολόγηση ακόμα.</p>
            <p className="text-[13px] text-zinc-600 mt-2">
              Γίνε ο πρώτος που θα μοιραστεί την εμπειρία του.
            </p>
            <Link
              href={`/${item.slug}`}
              className="inline-block mt-4 px-5 h-11 leading-[44px] rounded-full bg-zinc-900 text-white text-[14px] font-semibold"
            >
              Πρόσθεσε αξιολόγηση
            </Link>
          </div>
        ) : (
          reviews.map((r: any) => (
            <ReviewCard
              key={r.id}
              variant="list"
              id={r.id}
              rating={r.rating}
              text={r.reflection ?? ""}
              date={relativeDate(r.created_at)}
              name={r.users.display_name ?? "Χρήστης"}
              userData={r.users}
              badge={badgeForLevel(r.users.level ?? 1)}
              likes={r.vote_up ?? 0}
              dislikes={r.vote_down ?? 0}
              myVote={myVoteByReview.get(r.id) ?? null}
            />
          ))
        )}
      </div>
    </>
  );
}
