"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setSupabaseUser, setProfile, reset } = useAuthStore();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;

    const supabase = createClient();

    // Hydrate from existing session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchProfile(session.user.id, supabase);
        setProfile(profile);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, supabase);
          setProfile(profile);
        } else {
          reset();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setSupabaseUser, setProfile, reset]);

  return <>{children}</>;
}

async function fetchProfile(userId: string, supabase: SupabaseClient): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data as User | null;
}
