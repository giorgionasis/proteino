import type { Item } from "@/types";
import { createClient } from "@/lib/supabase/server";

export interface RecommendationService {
  getPersonalizedFeed(userId: string, limit?: number): Promise<Item[]>;
  getSimilar(itemId: string, limit?: number): Promise<Item[]>;
  getPrecomputed(userId: string, limit?: number): Promise<Item[]>;
}

export class SupabaseRecommendationService implements RecommendationService {
  async getPersonalizedFeed(userId: string, limit = 20): Promise<Item[]> {
    const supabase = createClient();

    // Serve pre-computed recs first, fall back to popular
    const { data: precomputed } = await supabase
      .schema("analytics" as never)
      .from("precomputed_recs")
      .select("item_id, score")
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .limit(limit);

    if (precomputed && precomputed.length > 0) {
      const ids = precomputed.map((r: { item_id: string }) => r.item_id);
      const { data: items } = await supabase
        .from("items")
        .select("*")
        .in("id", ids)
        .eq("is_published", true);
      return (items as Item[]) ?? [];
    }

    const { data: popular } = await supabase
      .from("items")
      .select("*")
      .eq("is_published", true)
      .order("avg_rating", { ascending: false })
      .limit(limit);

    return (popular as Item[]) ?? [];
  }

  async getSimilar(itemId: string, limit = 10): Promise<Item[]> {
    const supabase = createClient();

    // pgvector similarity search — requires match_items RPC defined in Supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).rpc("match_items", {
      query_item_id: itemId,
      match_count: limit,
    });

    return ((data as unknown) as Item[]) ?? [];
  }

  async getPrecomputed(userId: string, limit = 20): Promise<Item[]> {
    return this.getPersonalizedFeed(userId, limit);
  }
}

export function getRecommendationService(): RecommendationService {
  return new SupabaseRecommendationService();
}
