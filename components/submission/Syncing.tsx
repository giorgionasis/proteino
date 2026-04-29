export function Syncing() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-8 px-6">
      {/* Animated ring */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-coral-600/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-coral-600 animate-spin" />
      </div>

      {/* Steps checklist */}
      <div className="space-y-3 text-left w-full max-w-xs">
        {[
          "Κατηγορία αναγνωρίστηκε ✓",
          "Αντιστοιχία επαληθεύτηκε ✓",
          "Εμπλουτισμός δεδομένων...",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-coral-500 flex-shrink-0" />
            <span className="text-sm text-gray-400">{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
