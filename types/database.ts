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
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "created_at">;
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
          poster_url: string | null;
          backdrop_url: string | null;
          metadata: Json | null;
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
      item_movies: {
        Row: {
          item_id: string;
          director: string | null;
          duration_min: number | null;
          release_date: string | null;
          end_date: string | null;
          country: string | null;
          language: string | null;
          channel: string | null;
          trailer_url: string | null;
          status_message: string | null;
          plot: string | null;
          actors: Json;
          awards: Json;
        };
        Insert: Database["public"]["Tables"]["item_movies"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_movies"]["Row"]>;
      };
      item_series: {
        Row: {
          item_id: string;
          director: string | null;
          seasons: number | null;
          release_date: string | null;
          end_date: string | null;
          country: string | null;
          language: string | null;
          channel: string | null;
          trailer_url: string | null;
          status_message: string | null;
          plot: string | null;
          actors: Json;
        };
        Insert: Database["public"]["Tables"]["item_series"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_series"]["Row"]>;
      };
      item_books: {
        Row: {
          item_id: string;
          writer: string | null;
          publication: string | null;
          language: string | null;
          pages: number | null;
          publication_year: number | null;
          plot: string | null;
          is_trilogy: boolean;
          trilogy_name: string | null;
        };
        Insert: Database["public"]["Tables"]["item_books"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_books"]["Row"]>;
      };
      item_food: {
        Row: {
          item_id: string;
          cuisine: string | null;
          type: string | null;
          address: string | null;
          telephone: string | null;
          lat: number | null;
          lng: number | null;
          delivery_links: Json;
          external_ratings: Json;
          information: Json;
          plot: string | null;
        };
        Insert: Database["public"]["Tables"]["item_food"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_food"]["Row"]>;
      };
      item_recipes: {
        Row: {
          item_id: string;
          yields: number | null;
          calories: number | null;
          origin: string | null;
          level: string | null;
          channel: string | null;
          duration: Json;
          nutrition: Json;
          ingredients: Json;
          steps: Json;
          tips: string | null;
        };
        Insert: Database["public"]["Tables"]["item_recipes"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_recipes"]["Row"]>;
      };
      item_bars: {
        Row: {
          item_id: string;
          type: string | null;
          address: string | null;
          telephone: string | null;
          lat: number | null;
          lng: number | null;
          external_ratings: Json;
          information: Json;
          plot: string | null;
        };
        Insert: Database["public"]["Tables"]["item_bars"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_bars"]["Row"]>;
      };
      item_hotels: {
        Row: {
          item_id: string;
          type: string | null;
          address: string | null;
          telephone: string | null;
          lat: number | null;
          lng: number | null;
          price_range: string | null;
          facilities: Json;
          information: Json;
          external_ratings: Json;
          plot: string | null;
        };
        Insert: Database["public"]["Tables"]["item_hotels"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_hotels"]["Row"]>;
      };
      item_theater: {
        Row: {
          item_id: string;
          name_place: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          type: string | null;
          year: number | null;
          writer: string | null;
          director: string | null;
          availability: string | null;
          ticket_url: string | null;
          price: string | null;
          actors: Json;
          dates: Json;
          plot: string | null;
        };
        Insert: Database["public"]["Tables"]["item_theater"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_theater"]["Row"]>;
      };
      item_events: {
        Row: {
          item_id: string;
          name_place: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          event_type: string | null;
          availability: string | null;
          status: string | null;
          ticket_url: string | null;
          price: string | null;
          performers: Json;
          dates: Json;
          description: string | null;
        };
        Insert: Database["public"]["Tables"]["item_events"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_events"]["Row"]>;
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
