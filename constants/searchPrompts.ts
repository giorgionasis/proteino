/**
 * Empty-state search prompts shown to the user when the textarea is blank.
 * Tuned to the current season — refreshes monthly without persona data.
 *
 * Future: layer registered-user preferences (top categories from
 * bookmarks/suggestions, past search log) on top of seasonality. The
 * function exposes the seasonal floor; personalization wraps it.
 */

export function getSeasonalPrompts(): string[] {
  const month = new Date().getMonth(); // 0 = January
  if (month >= 4 && month <= 8) {
    // May–September
    return [
      "Βιβλίο για παραλία",
      "Cocktail bar για βράδυ",
      "Εστιατόρια στη θάλασσα",
    ];
  }
  if (month >= 9 && month <= 10) {
    // October–November
    return [
      "Ταινία για βροχερή Κυριακή",
      "Cozy καφέ με βιβλίο",
      "Συνταγές για το φθινόπωρο",
    ];
  }
  if (month === 11 || month <= 1) {
    // December–February
    return [
      "Σειρά για κρύα βράδια",
      "Ζεστό μενού για χειμώνα",
      "Δραματική ταινία",
    ];
  }
  // March–April
  return [
    "Βιβλία για την άνοιξη",
    "Δείπνο για ραντεβού",
    "Σειρά mini-series 8 επεισόδια",
  ];
}
