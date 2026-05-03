"use client";

import Link from "next/link";

interface ReviewRow {
  id: string;
  text: string;
  author: string;
  suggestion: string;
  rating: string;
  published: string;
  reports: number;
  isActive: boolean;
}

const MOCK_UNRESOLVED: ReviewRow[] = [
  { id: "1", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Stavroula Kyriakop...", suggestion: "Wednesday", rating: "5 ★k 17🟊", published: "5 ώρες πριν", reports: 1, isActive: true },
  { id: "2", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "George Nasis", suggestion: "Inception", rating: "5 ★k 17🟊", published: "17 ώρες πριν", reports: 1, isActive: true },
  { id: "3", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Eva Παπαϊωαννόυνν...", suggestion: "Η κυτάρα", rating: "5 ★k 17🟊", published: "8 Nov 2024", reports: 3, isActive: true },
];

const MOCK_ALL: ReviewRow[] = [
  { id: "4", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Stavroula Kyriakop...", suggestion: "Wednesday", rating: "5 ★k 17🟊", published: "5 ώρες πριν", reports: 0, isActive: true },
  { id: "5", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "George Nasis", suggestion: "Inception", rating: "5 ★k 17🟊", published: "17 ώρες πριν", reports: 0, isActive: true },
  { id: "6", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Lefteris Tsagharakis", suggestion: "Εκεί που τραγουδού...", rating: "5 ★k 17🟊", published: "1 ημέρα πριν", reports: 1, isActive: true },
  { id: "7", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Don Tomys", suggestion: "A priori", rating: "5 ★k 17🟊", published: "1 ημέρα πριν", reports: 2, isActive: false },
  { id: "8", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Konstantina Foutsitzi", suggestion: "Μπακαλκοσαβόρνε...", rating: "5 ★k 17🟊", published: "2 ημέρες πριν", reports: 0, isActive: true },
  { id: "9", text: "Κατεχόντ η σειρά είναι του Tim Burton, οπότε η σκηνοθεσία είναι πάρα πολύ καλή...", author: "Nikos Avramidis", suggestion: "Sprint", rating: "5 ★k 17🟊", published: "2 ημέρες πριν", reports: 0, isActive: true },
];

export function ReviewsTable() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-800 mb-6">Reviews</h1>

      {/* Unresolved section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-bold text-zinc-800">Unresolved</h2>
          <span className="w-6 h-6 rounded bg-zinc-200 text-xs font-bold text-zinc-700 flex items-center justify-center">
            {MOCK_UNRESOLVED.length}
          </span>
        </div>

        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide w-[280px]">Review</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Author</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestion</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rating</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Published</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reports</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
              </tr>
            </thead>
            <tbody>
              {MOCK_UNRESOLVED.map((row) => (
                <ReviewRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* All reviews */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide w-[280px]">Review</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Author</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Suggestion</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Rating</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Published</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Reports</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wide" />
            </tr>
          </thead>
          <tbody>
            {MOCK_ALL.map((row) => (
              <ReviewRow key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReviewRow({ row }: { row: ReviewRow }) {
  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
      <td className="px-4 py-3">
        <Link href={`/admin/reviews/${row.id}`} className="text-sm text-zinc-700 hover:underline line-clamp-2">
          {row.text}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-600">{row.author}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{row.suggestion}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{row.rating}</td>
      <td className="px-4 py-3 text-sm text-zinc-500">{row.published}</td>
      <td className="px-4 py-3 text-center">
        {row.reports > 0 ? (
          <span className={`w-6 h-6 rounded-full text-xs font-bold text-white flex items-center justify-center mx-auto ${row.reports >= 3 ? "bg-red-500" : "bg-red-400"}`}>
            {row.reports}
          </span>
        ) : (
          <span className="text-sm text-zinc-400">0</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <span className={`inline-flex items-center gap-1.5 text-sm ${row.isActive ? "text-emerald-600" : "text-red-500"}`}>
          <span className={`w-2 h-2 rounded-full ${row.isActive ? "bg-emerald-500" : "bg-red-500"}`} />
          {row.isActive ? "Active" : "Inactive"}
        </span>
      </td>
    </tr>
  );
}
