import type { CategorySlug } from "@/types";

export const SUBCATEGORIES: Record<CategorySlug, string[]> = {
  movies:  ["Δράμα", "Κωμωδία", "Θρίλερ", "Δράση", "Sci-Fi", "Ρομαντική", "Animation", "Ντοκιμαντέρ", "Horror", "Βιογραφική"],
  series:  ["Δράμα", "Κωμωδία", "Crime", "Sci-Fi", "Θρίλερ", "Ρομαντική", "Ντοκιμαντέρ", "Mini-series", "Animation"],
  books:   ["Μυθιστόρημα", "Θρίλερ", "Sci-Fi", "Ιστορία", "Αυτοβιογραφία", "Ψυχολογία", "Φιλοσοφία", "Self-help", "Ποίηση", "Business", "Παιδικά"],
  recipes: ["Κυρίως Πιάτο", "Ορεκτικά", "Επιδόρπια", "Breakfast", "Ψητά", "Σαλάτες", "Σούπες", "Γλυκά", "Ψωμί & Ζύμες"],
  food:    ["Ελληνική", "Ιταλική", "Ασιατική", "Burger", "Sushi", "Fine Dining", "Brunch", "Vegan", "Seafood", "Street Food", "Middle Eastern"],
  bars:    ["Cocktail Bar", "Wine Bar", "Jazz Bar", "Rooftop", "Beach Bar", "Coffee", "Speakeasy", "Pub", "All-Day", "Sports Bar"],
  hotels:  ["Ξενοδοχείο", "Διαμέρισμα", "Δωμάτιο", "Camping", "Μονοκατοικία"],
  theater: ["Θέατρο", "Μιούζικαλ", "Stand-up", "Μονόπρακτο", "Παιδικό"],
  events:  ["Συναυλία", "Festival", "Έκθεση", "Stand-up", "Workshop", "Sports"],
};

