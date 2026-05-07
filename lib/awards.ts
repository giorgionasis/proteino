import { Icon } from "@/components/ui/Icon";
import { createElement } from "react";
import type { GroupedListGroup } from "@/components/filters/GroupedCheckboxList";

/**
 * Canonical award taxonomy used by the awards filter. Item-side storage in
 * `item_movies.awards` jsonb is currently unstandardized (admin-entered, free
 * form), so for now we surface the picker UI with placeholder counts. A
 * future cleanup pass will normalize the jsonb shape and let us compute live
 * counts the same way regions do.
 *
 * IDs are globally unique across groups so the GroupedCheckboxList's flat
 * Set<string> selection model works directly.
 */
export const AWARDS_TAXONOMY: GroupedListGroup[] = [
  {
    id: "oscar",
    label: "ΟΣΚΑΡ",
    icon: createElement(Icon, { name: "oscar-best-picture", size: 24 }),
    items: [
      { id: "oscar-best-picture",          label: "Καλύτερης Ταινίας",       count: 0 },
      { id: "oscar-best-actor",            label: "Α' Ανδρικού",             count: 0 },
      { id: "oscar-best-actress",          label: "Α' Γυναικείου",           count: 0 },
      { id: "oscar-best-director",         label: "Καλύτερης Σκηνοθεσίας",   count: 0 },
      { id: "oscar-best-screenplay",       label: "Καλύτερου Σεναρίου",      count: 0 },
      { id: "oscar-best-supporting-actor",   label: "Β' Ανδρικού",           count: 0 },
      { id: "oscar-best-supporting-actress", label: "Β' Γυναικείου",         count: 0 },
    ],
  },
  {
    id: "bafta",
    label: "BAFTA",
    icon: createElement("span", { className: "text-[20px]" }, "🎭"),
    items: [
      { id: "bafta-best-film",     label: "Καλύτερης Ταινίας",     count: 0 },
      { id: "bafta-best-actor",    label: "Α' Ανδρικού",           count: 0 },
      { id: "bafta-best-director", label: "Καλύτερης Σκηνοθεσίας", count: 0 },
    ],
  },
  {
    id: "cannes",
    label: "CANNES",
    icon: createElement("span", { className: "text-[20px]" }, "🌴"),
    items: [
      { id: "cannes-palme-dor",       label: "Χρυσός Φοίνικας",       count: 0 },
      { id: "cannes-best-director",   label: "Καλύτερης Σκηνοθεσίας", count: 0 },
    ],
  },
  {
    id: "venice",
    label: "VENICE",
    icon: createElement("span", { className: "text-[20px]" }, "🦁"),
    items: [
      { id: "venice-golden-lion", label: "Χρυσό Λιοντάρι", count: 0 },
    ],
  },
  {
    id: "golden-globes",
    label: "GOLDEN GLOBES",
    icon: createElement("span", { className: "text-[20px]" }, "🌐"),
    items: [
      { id: "gg-best-drama",  label: "Καλύτερης Δραματικής Ταινίας", count: 0 },
      { id: "gg-best-comedy", label: "Καλύτερης Κωμωδίας",            count: 0 },
    ],
  },
];

export function getAwardsTaxonomy(): GroupedListGroup[] {
  // Returns a copy so callers can mutate counts without poisoning the module-level constant.
  return AWARDS_TAXONOMY.map((g) => ({
    ...g,
    items: g.items.map((it) => ({ ...it })),
  }));
}
