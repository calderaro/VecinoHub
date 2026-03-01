import Link from "next/link";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
  pageLabel: string;
  prevLabel: string;
  nextLabel: string;
  testId?: string;
};

export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  pageLabel,
  prevLabel,
  nextLabel,
  testId,
}: PaginationProps) {
  return (
    <div
      className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5"
      data-testid={testId}
    >
      <p className="text-xs text-stone-400">{pageLabel}</p>
      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
            href={buildHref(currentPage - 1)}
          >
            {prevLabel}
          </Link>
        ) : null}
        <span className="px-1.5 text-xs font-medium text-stone-500">
          {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link
            className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
            href={buildHref(currentPage + 1)}
          >
            {nextLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
