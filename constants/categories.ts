import type { CategorySlug } from "@/types";

export interface Category {
  slug: CategorySlug;
  label: string;
  labelEl: string;
  icon: string;
  hasMap: boolean;
  hasTrailer: boolean;
  hasDelivery: boolean;
  hasTicketLink: boolean;
  hasPriceRange: boolean;
  hasNearbyActivities: boolean;
}

export const CATEGORIES: Category[] = [
  {
    slug: "movies",
    label: "Movies",
    labelEl: "Ταινίες",
    icon: "🎬",
    hasMap: false,
    hasTrailer: true,
    hasDelivery: false,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "series",
    label: "Series",
    labelEl: "Σειρές",
    icon: "📺",
    hasMap: false,
    hasTrailer: true,
    hasDelivery: false,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "books",
    label: "Books",
    labelEl: "Βιβλία",
    icon: "📚",
    hasMap: false,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "food",
    label: "Food",
    labelEl: "Φαγητό",
    icon: "🍽️",
    hasMap: true,
    hasTrailer: false,
    hasDelivery: true,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "recipes",
    label: "Recipes",
    labelEl: "Συνταγές",
    icon: "👨‍🍳",
    hasMap: false,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "bars",
    label: "Bars & Cafes",
    labelEl: "Μπαρ & Καφέ",
    icon: "☕",
    hasMap: true,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: false,
    hasPriceRange: false,
    hasNearbyActivities: false,
  },
  {
    slug: "hotels",
    label: "Hotels",
    labelEl: "Ξενοδοχεία",
    icon: "🏨",
    hasMap: true,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: true,
    hasPriceRange: true,
    hasNearbyActivities: true,
  },
  {
    slug: "theater",
    label: "Theater",
    labelEl: "Θέατρο",
    icon: "🎭",
    hasMap: true,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: true,
    hasPriceRange: true,
    hasNearbyActivities: false,
  },
  {
    slug: "events",
    label: "Events",
    labelEl: "Εκδηλώσεις",
    icon: "🎉",
    hasMap: true,
    hasTrailer: false,
    hasDelivery: false,
    hasTicketLink: true,
    hasPriceRange: true,
    hasNearbyActivities: false,
  },
];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
