"use client";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function AdminPagination({ page, totalPages, totalItems, pageSize, onPageChange }: Props) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= Math.min(3, totalPages); i++) pages.push(i);
  if (totalPages > 4) pages.push("...");
  if (totalPages > 3) pages.push(totalPages);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
      <p className="text-sm text-zinc-500">
        Showing {start} to {end} of {totalItems} results
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Prev
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dots-${i}`} className="px-2 text-sm text-zinc-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 text-sm rounded ${
                p === page
                  ? "bg-zinc-900 text-white font-medium"
                  : "text-zinc-600 hover:bg-zinc-50"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
