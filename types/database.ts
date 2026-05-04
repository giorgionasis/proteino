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
      subcategories: {
        Row: {
          id: string;
          category: string;
          name: string;
          slug: string;
          description_seo: string | null;
          display_order: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["subcategories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["subcategories"]["Row"]>;
      };
      regions: {
        Row: {
          id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["regions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["regions"]["Row"]>;
      };
      items: {
        Row: {
          id: string;
          category: string;
          subcategory_id: string | null;
          title: string;
          slug: string;
          description_seo: string | null;
          cover_url: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          images: Json;
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
          director: Json;
          duration_min: number | null;
          release_date: string | null;
          end_date: string | null;
          country: Json;
          language: string | null;
          channel: string | null;
          trailer_url: string | null;
          status_message: string | null;
          plot: string | null;
          actors: Json;
          awards: Json;
          attributes: Json;
        };
        Insert: Database["public"]["Tables"]["item_movies"]["Row"];
        Update: Partial<Database["public"]["Tables"]["item_movies"]["Row"]>;
      };
      item_series: {
        Row: {
          item_id: string;
          director: string | null;
          seasons: Json;
          release_date: string | null;
          end_date: string | null;
          country: Json;
          language: string | null;
          channel: string | null;
          trailer_url: string | null;
          status_message: string | null;
          plot: string | null;
          actors: Json;
          awards: Json;
          attributes: Json;
          streaming_platforms: Json;
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
          buy_links: Json;
          author_info: Json;
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
          region_id: string | null;
          source: string | null;
          attributes: Json;
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
          chef: string | null;
          website: string | null;
          duration: Json;
          nutrition: Json;
          ingredients: Json;
          steps: Json;
          tips: Json;
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
          region_id: string | null;
          source: string | null;
          attributes: Json;
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
          region_id: string | null;
          source: string | null;
          price_range: string | null;
          facilities: Json;
          availability_links: Json;
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
          region_id: string | null;
          type: string | null;
          event_mode: string | null;
          year: number | null;
          writer: string | null;
          director: string | null;
          ticket_url: string | null;
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
          region_id: string | null;
          event_type: string | null;
          event_mode: string | null;
          status: string | null;
          year: number | null;
          writer: string | null;
          director: string | null;
          ticket_url: string | null;
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
      app_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["app_settings"]["Row"], "updated_at">;
        Update: Partial<Database["public"]["Tables"]["app_settings"]["Row"]>;
      };
      category_filters: {
        Row: {
          id: string;
          category: string;
          filter_id: string;
          label: string;
          widget: string;
          placeholder: string | null;
          options: Json;
          is_quick: boolean;
          display_order: number;
          is_published: boolean;
          created_at: string;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["category_filters"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["category_filters"]["Row"]>;
      };
      category_filter_settings: {
        Row: {
          category: string;
          has_nearby: boolean;
          sort_options: Json;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["category_filter_settings"]["Row"], "modified_at">;
        Update: Partial<Database["public"]["Tables"]["category_filter_settings"]["Row"]>;
      };
      movies_tonight: {
        Row: {
          id: string;
          item_id: string;
          channel: string;
          air_date: string;       // YYYY-MM-DD
          air_time: string;       // HH:MM:SS
          is_published: boolean;
          created_at: string;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["movies_tonight"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["movies_tonight"]["Row"]>;
      };
      activity_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          display_order: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_categories"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_categories"]["Row"]>;
      };
      activity_types: {
        Row: {
          id: string;
          category_id: string;
          name: string;
          slug: string;
          icon: string | null;
          image_url: string | null;
          display_order: number;
          is_published: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activity_types"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["activity_types"]["Row"]>;
      };
      activities: {
        Row: {
          id: string;
          type_id: string;
          name: string;
          description: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          website_url: string | null;
          facebook_url: string | null;
          instagram_url: string | null;
          phone: string | null;
          image_url: string | null;
          is_published: boolean;
          created_at: string;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["activities"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["activities"]["Row"]>;
      };
      collections: {
        Row: {
          id: string;
          type: "card" | "carousel";
          title: string;
          title_specific: string | null;
          alias: string;
          image_url: string | null;
          source_category: string | null;
          tags: Json;
          filters: Json;
          item_limit: number;
          is_published: boolean;
          valid_from: string | null;
          valid_until: string | null;
          target_audience: "all" | "registered" | "guest";
          created_at: string;
          modified_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["collections"]["Row"], "id" | "created_at" | "modified_at">;
        Update: Partial<Database["public"]["Tables"]["collections"]["Row"]>;
      };
      collection_placements: {
        Row: {
          id: string;
          collection_id: string;
          context: "home" | "category" | "suggestions";
          category: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["collection_placements"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["collection_placements"]["Row"]>;
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
