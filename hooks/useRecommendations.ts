"use client";

import { useState, useEffect } from "react";
import type { Item } from "@/types";

interface UseRecommendationsReturn {
  items: Item[];
  loading: boolean;
  error: string | null;
}

export function useRecommendations(userId: string | null): UseRecommendationsReturn {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = userId
          ? `/api/recommendations?userId=${userId}`
          : `/api/recommendations/popular`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to load recommendations");
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  return { items, loading, error };
}
