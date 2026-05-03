import type { CategorySlug } from "@/types";

export type FilterWidgetType =
  | "dropdown"
  | "search-dropdown"
  | "segmented"
  | "platform-cards"
  | "icon-cards"
  | "checkboxes"
  | "price-range"
  | "origin-cards";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

export interface FilterDefinition {
  id: string;
  label: string;
  widget: FilterWidgetType;
  options?: FilterOption[];
  placeholder?: string;
}

export interface QuickFilterDef {
  id: string;
  label: string;
}

export interface CategoryFilters {
  quickFilters: QuickFilterDef[];
  hasNearby: boolean;
  bottomSheet: FilterDefinition[];
  sortOptions: string[];
}

const DEFAULT_SORT = ["Πιο Πρόσφατα", "Δημοφιλή", "Βαθμολογία"];

export const CATEGORY_FILTERS: Record<CategorySlug, CategoryFilters> = {
  movies: {
    quickFilters: [
      { id: "platform", label: "Διαθέσιμη" },
    ],
    hasNearby: false,
    bottomSheet: [
      { id: "genre", label: "Κατηγορία", widget: "dropdown" },
      { id: "director", label: "Σκηνοθέτης", widget: "search-dropdown", placeholder: "Διάλεξε σκηνοθέτη πχ Nolan" },
      { id: "actor", label: "Πρωταγωνιστής", widget: "search-dropdown", placeholder: "Διάλεξε πρωταγωνιστή πχ Πατσίνο" },
      {
        id: "duration", label: "Διάρκεια", widget: "segmented",
        options: [
          { id: "all", label: "Όλα" },
          { id: "90", label: "90'" },
          { id: "120", label: "120'" },
          { id: "150", label: "150'+" },
        ],
      },
      {
        id: "platform", label: "Διαθέσιμη", widget: "platform-cards",
        options: [
          { id: "netflix", label: "Netflix" },
          { id: "disney", label: "Disney+" },
          { id: "prime", label: "Prime" },
          { id: "youtube", label: "YouTube" },
        ],
      },
      { id: "awards", label: "Βραβεία", widget: "dropdown", placeholder: "Διάλεξε Βραβεία" },
    ],
    sortOptions: DEFAULT_SORT,
  },

  series: {
    quickFilters: [
      { id: "platform", label: "Διαθέσιμη" },
    ],
    hasNearby: false,
    bottomSheet: [
      { id: "genre", label: "Κατηγορία", widget: "dropdown" },
      {
        id: "platform", label: "Διαθέσιμη", widget: "platform-cards",
        options: [
          { id: "netflix", label: "Netflix" },
          { id: "disney", label: "Disney+" },
          { id: "prime", label: "Prime" },
          { id: "youtube", label: "YouTube" },
        ],
      },
      {
        id: "characteristics", label: "Χαρακτηριστικά", widget: "checkboxes",
        options: [
          { id: "completed", label: "Η σειρά έχει ολοκληρωθεί" },
          { id: "single_season", label: "Σειρά με 1 σεζόν" },
          { id: "true_story", label: "Βασισμένη σε αληθινά γεγονότα" },
        ],
      },
      { id: "actor", label: "Πρωταγωνιστής", widget: "search-dropdown", placeholder: "Διάλεξε πρωταγωνιστή πχ Πατσίνο" },
      { id: "awards", label: "Βραβεία", widget: "dropdown", placeholder: "Διάλεξε Βραβεία" },
    ],
    sortOptions: DEFAULT_SORT,
  },

  books: {
    quickFilters: [],
    hasNearby: false,
    bottomSheet: [
      { id: "genre", label: "Κατηγορία", widget: "dropdown" },
      { id: "writer", label: "Συγγραφέας", widget: "search-dropdown", placeholder: "Διάλεξε συγγραφέα πχ Κοέλιο" },
      { id: "publisher", label: "Εκδόσεις", widget: "search-dropdown", placeholder: "Διάλεξε εκδόσεις πχ Διόπτρα" },
    ],
    sortOptions: [...DEFAULT_SORT, "Σελίδες"],
  },

  recipes: {
    quickFilters: [
      { id: "level", label: "Επίπεδο" },
    ],
    hasNearby: false,
    bottomSheet: [
      { id: "type", label: "Κατηγορία", widget: "dropdown" },
      { id: "origin", label: "Προέλευση", widget: "origin-cards" },
      {
        id: "level", label: "Επίπεδο", widget: "checkboxes",
        options: [
          { id: "easy", label: "Εύκολη" },
          { id: "medium", label: "Μέτρια" },
          { id: "hard", label: "Δύσκολη" },
        ],
      },
      {
        id: "diet", label: "Διατροφή", widget: "checkboxes",
        options: [
          { id: "no_milk", label: "Χωρίς γάλα" },
          { id: "vegan", label: "Vegan" },
          { id: "no_sugar", label: "Χωρίς ζάχαρη" },
        ],
      },
    ],
    sortOptions: DEFAULT_SORT,
  },

  food: {
    quickFilters: [
      { id: "region", label: "Περιοχή" },
    ],
    hasNearby: true,
    bottomSheet: [
      { id: "region", label: "Περιοχή", widget: "dropdown" },
      { id: "type", label: "Είδος", widget: "dropdown" },
      { id: "cuisine", label: "Κουζίνα", widget: "dropdown" },
      {
        id: "delivery", label: "Delivery", widget: "platform-cards",
        options: [
          { id: "efood", label: "efood" },
          { id: "box", label: "Box" },
        ],
      },
    ],
    sortOptions: DEFAULT_SORT,
  },

  bars: {
    quickFilters: [
      { id: "region", label: "Περιοχή" },
    ],
    hasNearby: true,
    bottomSheet: [
      { id: "region", label: "Περιοχή", widget: "dropdown" },
    ],
    sortOptions: DEFAULT_SORT,
  },

  hotels: {
    quickFilters: [
      { id: "price", label: "Τιμή" },
    ],
    hasNearby: false,
    bottomSheet: [
      { id: "region", label: "Περιοχή", widget: "dropdown" },
      {
        id: "property_type", label: "Είδος", widget: "icon-cards",
        options: [
          { id: "hotel", label: "Ξενοδοχείο" },
          { id: "apartment", label: "Διαμέρισμα" },
          { id: "rooms", label: "Δωμάτια" },
          { id: "villa", label: "Βίλα" },
        ],
      },
      { id: "price", label: "Εύρος τιμής", widget: "price-range" },
    ],
    sortOptions: DEFAULT_SORT,
  },

  theater: {
    quickFilters: [],
    hasNearby: false,
    bottomSheet: [
      { id: "type", label: "Κατηγορία", widget: "dropdown" },
      { id: "actor", label: "Πρωταγωνιστής", widget: "search-dropdown", placeholder: "Διάλεξε πρωταγωνιστή πχ Βλάχος" },
      {
        id: "when", label: "Πότε παίζεται", widget: "segmented",
        options: [
          { id: "all", label: "Όλα" },
          { id: "this_week", label: "Αυτή την\nεβδομάδα" },
          { id: "this_month", label: "Αυτό το\nμήνα" },
        ],
      },
    ],
    sortOptions: DEFAULT_SORT,
  },

  events: {
    quickFilters: [],
    hasNearby: false,
    bottomSheet: [
      { id: "event_type", label: "Κατηγορία", widget: "dropdown" },
      { id: "region", label: "Περιοχή", widget: "dropdown" },
      {
        id: "when", label: "Πότε", widget: "segmented",
        options: [
          { id: "all", label: "Όλα" },
          { id: "this_week", label: "Αυτή την\nεβδομάδα" },
          { id: "this_month", label: "Αυτό το\nμήνα" },
        ],
      },
      { id: "performer", label: "Καλλιτέχνης", widget: "search-dropdown", placeholder: "Διάλεξε καλλιτέχνη πχ Μάλαμας" },
    ],
    sortOptions: DEFAULT_SORT,
  },
};
