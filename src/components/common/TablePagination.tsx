import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

/**
 * Lightweight pagination control for admin tables.
 * Shows: "Showing X–Y of Z students" with Prev / page numbers / Next.
 */
export const TablePagination = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = "items",
}: TablePaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems === 0) return null;

  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  // Build a compact page list with ellipses (max ~7 entries)
  const pages: (number | "...")[] = [];
  const window = 1;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= safePage - window && i <= safePage + window)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-4 px-1">
      <p className="text-xs text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span> {itemLabel}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline ml-1">Previous</span>
        </Button>
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) =>
            p === "..." ? (
              <span
                key={`ellipsis-${idx}`}
                className="px-2 text-xs text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={p}
                variant={p === safePage ? "default" : "outline"}
                size="sm"
                className="h-8 w-8 p-0 text-xs"
                onClick={() => onPageChange(p)}
                aria-current={p === safePage ? "page" : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </Button>
            )
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TablePagination;
