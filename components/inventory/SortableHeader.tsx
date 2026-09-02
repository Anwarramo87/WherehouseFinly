"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type { ProductSortField, SortDirection } from "@/hooks/useInventory";

type Props = {
  label: string;
  field: ProductSortField;
  activeField?: ProductSortField;
  direction: SortDirection;
  onSort: (field: ProductSortField) => void;
  align?: "center" | "right";
};

/**
 * A column header that sorts on click.
 *
 * The sort itself happens server-side -- the API orders the whole result set,
 * not just the page on screen, so sorting a 900-product catalogue by price
 * actually surfaces the cheapest item rather than the cheapest of the fifty
 * currently loaded.
 */
export default function SortableHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
  align = "center",
}: Props) {
  const isActive = activeField === field;

  return (
    <th
      // aria-sort belongs on the header cell; on the button it is ignored,
      // because the implicit `button` role does not support it.
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={`p-5 ${align === "center" ? "text-center" : "text-right"}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        title={`ترتيب حسب ${label}`}
        className={`group/sort inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-black uppercase tracking-wider transition-all
          ${align === "center" ? "mx-auto" : ""}
          ${
            isActive
              ? "bg-[#C89355]/15 text-[#8a5f26] shadow-inner"
              : "text-[#263544] hover:bg-white/70 hover:text-[#8a5f26]"
          }
          focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89355]/60`}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp size={14} className="shrink-0" />
          ) : (
            <ArrowDown size={14} className="shrink-0" />
          )
        ) : (
          <ChevronsUpDown
            size={14}
            className="shrink-0 opacity-30 transition-opacity group-hover/sort:opacity-70"
          />
        )}
      </button>
    </th>
  );
}
