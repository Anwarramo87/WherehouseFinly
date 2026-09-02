"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  isFetching?: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

const PAGE_SIZES = [25, 50, 100, 200];

/**
 * Pager for the product list.
 *
 * The list used to request `limit: 100` with no controls, so a catalogue larger
 * than that was silently cut off with nothing on screen to say so. This shows
 * the real total and lets the page size be changed.
 *
 * Note the arrow directions: the page is right-to-left, so "previous" points
 * right and "next" points left.
 */
export default function TablePagination({
  page,
  limit,
  total,
  totalPages,
  isFetching = false,
  onPageChange,
  onLimitChange,
}: Props) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  /** A short window around the current page, with ellipses for the gaps. */
  const pages: (number | "…")[] = [];
  const window = 1;
  for (let p = 1; p <= safeTotalPages; p += 1) {
    if (p === 1 || p === safeTotalPages || Math.abs(p - page) <= window) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  const btn =
    "min-w-10 h-10 px-3 rounded-xl text-xs font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89355]/60";

  return (
    <div className="relative z-10 flex flex-col gap-4 border-t border-white/80 bg-white/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 text-xs font-black text-[#263544]/70">
        <span>
          {total === 0 ? "لا توجد أصناف" : `عرض ${from.toLocaleString()}–${to.toLocaleString()} من ${total.toLocaleString()}`}
        </span>
        {isFetching && (
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#C89355]" aria-hidden />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs font-black text-[#263544]/70">
          <span>لكل صفحة</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="cursor-pointer appearance-none rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-[#263544] shadow-inner outline-none focus:ring-2 focus:ring-[#C89355]/50"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="الصفحة السابقة"
            className={`${btn} bg-white/80 text-[#263544] hover:bg-white`}
          >
            <ChevronRight size={16} className="mx-auto" />
          </button>

          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-xs font-black text-[#263544]/40">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={`${btn} ${
                  p === page
                    ? "bg-[#C89355] text-white shadow-md"
                    : "bg-white/80 text-[#263544] hover:bg-white"
                }`}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= safeTotalPages}
            aria-label="الصفحة التالية"
            className={`${btn} bg-white/80 text-[#263544] hover:bg-white`}
          >
            <ChevronLeft size={16} className="mx-auto" />
          </button>
        </div>
      </div>
    </div>
  );
}
