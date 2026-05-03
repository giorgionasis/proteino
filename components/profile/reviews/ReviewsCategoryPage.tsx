"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewCard } from "./ReviewCard";

/* ── Sort options ─────────────────────────────────────────────── */

type SortKey = "recent" | "popular" | "high" | "low";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "recent",  label: "Πιο Πρόσφατες" },
  { key: "popular", label: "Πιο Δημοφιλή" },
  { key: "high",    label: "Υψηλ. Βαθμολ." },
  { key: "low",     label: "Χαμ. Βαθμολ." },
];

/* ── Mock data ────────────────────────────────────────────────── */

const LONG_REVIEW = `Όταν ξεκίνησα να διαβάζω το πρώτο της βιβλίο, ήδη από τις αρχικές σελίδες κατάλαβα ότι αυτό το κορίτσι έχει ένα λαμπρό μέλλον στη συγγραφή. Δε διαψεύστηκα. Η νέα της ιστορία είναι εξίσου εξαιρετική. Η Αθηνά Καμάτσου με τον απλό τρόπο γραφής της ξετυλίγει σταδιακά και με δεξιοτεχνία την πλοκή της, περνώντας τα μηνύματα που πρέπει όλοι να καταλάβουμε. Πόσο εύκολο είναι να δείχνουμε δυνατοί ενώ μέσα μας κλαίμε; Η Έλλη μετά από μια κακοποιητική σχέση προσπαθεί να σταθεί στα πόδια της, να αντιμετωπίσει τους δαίμονές της και να κάνει τα όνειρά της πραγματικότητα.`;

const MOCK_REVIEWS = [
  {
    id: "1",
    itemTitle: "Πλάσματα μιας μέρας",
    starCount: 5,
    date: "χθες",
    likeCount: 17,
    dislikeCount: 3,
    reviewText: LONG_REVIEW,
  },
  {
    id: "2",
    itemTitle: "Πλάσματα μιας μέρας",
    starCount: 4,
    date: "3 μέρες πριν",
    likeCount: 8,
    dislikeCount: 1,
    reviewText: LONG_REVIEW,
  },
];

/* ── Category labels ──────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  vivlia:   "βιβλία",
  tainies:  "ταινίες",
  fagito:   "φαγητό",
  syntages: "συνταγές",
};

/* ── Main component ───────────────────────────────────────────── */

interface Props {
  handle: string;
  category: string;
}

export function ReviewsCategoryPage({ handle, category }: Props) {
  const router = useRouter();
  const [sort, setSort] = useState<SortKey>("recent");

  const categoryLabel = CATEGORY_LABELS[category] ?? category;
  const count = MOCK_REVIEWS.length;

  return (
    <div className="bg-white min-h-screen">
      {/* Page sub-header */}
      <div
        className="sticky top-0 z-20 bg-white flex items-center h-14 border-b border-zinc-200"
        style={{ paddingLeft: 12 }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Πίσω"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-zinc-100 transition-colors shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <p className="flex-1 text-center text-base font-bold text-[#3F3F46] pr-11">
          Οι αξιολογήσεις μου
        </p>
      </div>

      <div className="flex flex-col gap-8 pb-10">
        {/* Stats pill */}
        <div className="mx-6 mt-6">
          <div
            className="flex items-center gap-2.5 rounded-[8px] px-4 py-4"
            style={{ backgroundColor: "#F2F2F7" }}
          >
            <span
              className="font-bold text-[#27272A] leading-none"
              style={{ fontSize: 52, lineHeight: "37px" }}
            >
              {count}
            </span>
            <span className="text-base text-[#3F3F46] leading-snug" style={{ fontWeight: 500 }}>
              αξιολογήσεις σε <strong className="font-bold">{categoryLabel}</strong>
            </span>
          </div>
        </div>

        {/* Sort bar */}
        <div className="flex flex-col gap-3">
          <p className="pl-6 text-base font-bold text-[#3F3F46]">Ταξινόμηση ανά</p>
          <div className="overflow-x-auto pl-6 pr-4 no-scrollbar">
            <div className="flex gap-3 w-max">
              {SORT_OPTIONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  className="flex items-center justify-center px-5 py-[17px] rounded-full whitespace-nowrap transition-colors"
                  style={
                    sort === key
                      ? { backgroundColor: "#52525B", border: "none" }
                      : { backgroundColor: "#FFFFFF", border: "1px solid #D4D4D8" }
                  }
                >
                  <span
                    className="text-base leading-[19.5px]"
                    style={{
                      fontWeight: sort === key ? 700 : 600,
                      color: sort === key ? "#FAFAFA" : "#3F3F46",
                    }}
                  >
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Review cards */}
        <div className="flex flex-col gap-12 px-6">
          {MOCK_REVIEWS.map((r) => (
            <ReviewCard key={r.id} {...r} />
          ))}
        </div>
      </div>
    </div>
  );
}
