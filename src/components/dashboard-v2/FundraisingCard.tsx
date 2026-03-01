import Link from "next/link";
import { CalendarIcon, HeartHandshakeIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

type FundraisingCardItem = {
  id: string;
  href: string;
  title: string;
  goalLabel: string;
  perGroupLabel: string;
  dueLabel: string | null;
  isUrgent: boolean;
  daysUntil: number | null;
};

type FundraisingCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: FundraisingCardItem[];
  testId?: string;
};

export function FundraisingCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: FundraisingCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-amber-600"
      icon={<HeartHandshakeIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <HeartHandshakeIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((campaign) => (
        <Link
          key={campaign.id}
          href={campaign.href}
          data-testid={`dashboard-fundraising-row-${campaign.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-amber-50">
            <HeartHandshakeIcon className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900 transition-colors group-hover:text-amber-700">
              {campaign.title}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <span className="text-xs text-stone-500">
                <span className="font-medium text-stone-700">{campaign.goalLabel}</span>
              </span>
              <span className="text-xs text-stone-300" aria-hidden="true">
                ·
              </span>
              <span className="text-xs font-semibold text-amber-700">{campaign.perGroupLabel}</span>
            </div>

            {campaign.dueLabel ? (
              <div className="mt-0.5 flex items-center gap-1">
                <CalendarIcon className="h-3 w-3 flex-shrink-0 text-stone-400" aria-hidden="true" />
                <span
                  className={`text-xs ${campaign.isUrgent ? "font-medium text-red-500" : "text-stone-400"}`}
                >
                  {campaign.dueLabel}
                  {campaign.isUrgent && campaign.daysUntil !== null
                    ? ` · ${campaign.daysUntil}d left`
                    : ""}
                </span>
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
