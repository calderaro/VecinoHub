import Link from "next/link";
import { LandmarkIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

type FundsCardItem = {
  id: string;
  href: string;
  title: string;
  balanceLabel: string;
  periodsLabel: string;
  statusLabel: string;
};

type FundsCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: FundsCardItem[];
  testId?: string;
};

export function FundsCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: FundsCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-teal-700"
      icon={<LandmarkIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <LandmarkIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((fund) => (
        <Link
          key={fund.id}
          href={fund.href}
          data-testid={`dashboard-fund-row-${fund.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal-50">
            <LandmarkIcon className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900 transition-colors group-hover:text-teal-700">
              {fund.title}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="text-xs font-medium text-stone-700">{fund.balanceLabel}</span>
              <span className="text-xs text-stone-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs text-stone-500">{fund.periodsLabel}</span>
            </div>
            <p className="mt-0.5 text-xs text-stone-400">{fund.statusLabel}</p>
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
