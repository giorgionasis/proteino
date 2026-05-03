interface Props {
  count: number;
  categoryLabel: string;
  showMap?: boolean;
  onToggleMap: () => void;
  hasMap: boolean;
}

export function CategoryHeroStats({ count, categoryLabel, onToggleMap, hasMap }: Props) {
  const formatted = count >= 1000
    ? `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 3).replace(".", ",")}`.replace(/,?0+$/, "")
    : count.toString();

  return (
    <section className="px-6 pt-5 pb-6 space-y-5">
      {/* Stat */}
      <div>
        <p className="font-extrabold text-zinc-800 leading-[120%]" style={{ fontSize: 40 }}>
          {formatted}
        </p>
        <p className="text-base leading-[120%] mt-1 text-zinc-700">
          <span className="font-normal">Προτάσεις για να ανακαλύψεις σε </span>
          <span className="font-bold text-zinc-900">{categoryLabel}</span>
        </p>
      </div>

      {/* Map toggle buttons */}
      {hasMap && (
        <div className="flex gap-3">
          <button
            onClick={onToggleMap}
            className="flex-1 h-14 flex items-center justify-center gap-3 rounded-full text-base font-semibold transition-colors active:opacity-80"
            style={{ border: "2px solid #52525B", color: "#3F3F46" }}
          >
            <MapIcon />
            Χάρτης
          </button>
          <button
            className="flex-1 h-14 flex items-center justify-center gap-3 rounded-full text-base font-semibold transition-colors"
            style={{ backgroundColor: "#3F3F46", color: "#FAFAFA" }}
          >
            <ListIcon />
            Λίστα
          </button>
        </div>
      )}
    </section>
  );
}

function MapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
      <path d="M9 4v13M15 7v13" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="3" cy="6" r="1" fill="currentColor" />
      <circle cx="3" cy="12" r="1" fill="currentColor" />
      <circle cx="3" cy="18" r="1" fill="currentColor" />
    </svg>
  );
}
