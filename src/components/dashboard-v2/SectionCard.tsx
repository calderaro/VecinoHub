import Link from "next/link";
import type { ReactNode } from "react";

type SectionCardProps = {
  title: string;
  count?: number;
  icon: ReactNode;
  iconClassName: string;
  actionHref?: string;
  actionLabel?: string;
  emptyState?: ReactNode;
  isEmpty?: boolean;
  children: ReactNode;
  testId?: string;
};

export function SectionCard({
  title,
  count,
  icon,
  iconClassName,
  actionHref,
  actionLabel,
  emptyState,
  isEmpty = false,
  children,
  testId,
}: SectionCardProps) {
  return (
    <article
      className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
      data-testid={testId}
    >
      <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex-shrink-0 ${iconClassName}`} aria-hidden="true">
            {icon}
          </span>
          <h2 className="truncate text-base font-semibold text-stone-900">{title}</h2>
          {typeof count === "number" ? (
            <span className="inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-medium tabular-nums text-stone-600">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </div>

        {actionHref && actionLabel ? (
          <Link
            href={actionHref}
            className="dashboard-v2-focus flex flex-shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-teal-600 transition-colors hover:text-teal-700"
            aria-label={`${actionLabel} - ${title}`}
          >
            <span>{actionLabel}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </header>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center gap-2 px-5 py-10 text-center">
          {emptyState}
        </div>
      ) : (
        <div className="divide-y divide-stone-100">{children}</div>
      )}
    </article>
  );
}
