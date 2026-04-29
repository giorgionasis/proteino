// Auto-generate this file with: npx supabase gen types typescript --project-id <id>
// Manual stub until Supabase project is linked

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          handle: string;
          display_name: string;
          bio: string | null;
          avatar_url: string | null;
          role: "user" | "admin";
          gender: string | null;
          region: string | null;
          birthday: string | null;
          points: number;
          level: number;
          suggestion_count: number;
          rating_count: number;
          avg_quality_score: number | null;
          embedding: unknown | null;
          is_private: boolean;
          is_verified: boolean;
          created_at: string;
          last_login_at: string | null;
          last_suggestion_at: string | null;
          last_review_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Row"]>;
      };
      items: {
        Row: {
          id: string;
          category: string;
          title: string;
          slug: string;
          description_seo: string | null;
          cover_url: string | null;
          avg_rating: number;
          rating_count: number;
          suggestion_count: number;
          is_published: boolean;
          embedding: unknown | null;
          created_at: string;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["items"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["items"]["Row"]>;
      };
      suggestions: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          reflection: string | null;
          rating: number | null;
          ai_quality_score: number | null;
          ai_match_data: Json | null;
          content_hash: string;
          is_published: boolean;
          created_at: string;
          published_at: string | null;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["suggestions"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["suggestions"]["Row"]>;
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          suggestion_id: string | null;
          score: number;
          vote_up: number;
          vote_down: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ratings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ratings"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          suggestion_id: string;
          parent_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["comments"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["comments"]["Row"]>;
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          category: string;
          status: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["bookmarks"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["bookmarks"]["Row"]>;
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["follows"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["follows"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          name: string;
          payload: Json;
          email_enabled: boolean;
          push_enabled: boolean;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
  analytics: {
    Tables: {
      activity_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["analytics"]["Tables"]["activity_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["analytics"]["Tables"]["activity_log"]["Row"]>;
      };
      search_log: {
        Row: {
          id: string;
          user_id: string | null;
          query: string;
          analysis: Json | null;
          result_count: number | null;
          created_at: string;
        };
        Insert: Omit<Database["analytics"]["Tables"]["search_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["analytics"]["Tables"]["search_log"]["Row"]>;
      };
      precomputed_recs: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          score: number;
          reason: string | null;
          computed_at: string;
        };
        Insert: Omit<Database["analytics"]["Tables"]["precomputed_recs"]["Row"], "id">;
        Update: Partial<Database["analytics"]["Tables"]["precomputed_recs"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
