export interface HeroVignette {
  slug: string;
  image: string;
  line: string;
  ready: boolean;
}

export const HERO_VIGNETTES: HeroVignette[] = [
  {
    slug: "recipe",
    image: "/heroes/hero_suggestion_recipe.png",
    line: "*Η Κατερίνα πρότεινε την μεξικάνικη σαλάτα της",
    ready: true,
  },
  {
    slug: "food",
    image: "/heroes/hero_suggestion_food.png",
    line: "*Ο Νίκος πρότεινε μια ταβέρνα στην παραλία",
    ready: false,
  },
  {
    slug: "movie",
    image: "/heroes/hero_suggestion_movie.png",
    line: "*Η Μαρία πρότεινε την αγαπημένη της ταινία",
    ready: false,
  },
  {
    slug: "bar",
    image: "/heroes/hero_suggestion_bar.png",
    line: "*Ο Γιώργος πρότεινε ένα rooftop στο Κουκάκι",
    ready: false,
  },
  {
    slug: "book",
    image: "/heroes/hero_suggestion_book.png",
    line: "*Η Ελένη πρότεινε ένα βιβλίο που τη συγκίνησε",
    ready: false,
  },
  {
    slug: "hotel",
    image: "/heroes/hero_suggestion_hotel.png",
    line: "*Ο Δημήτρης πρότεινε ένα ξενοδοχείο στη Σαντορίνη",
    ready: false,
  },
];
