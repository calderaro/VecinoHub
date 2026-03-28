import Link from "next/link";
import { CalendarRangeIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

type ResourcesCardItem = {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  statusLabel: string;
};

type ResourcesCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: ResourcesCardItem[];
  testId?: string;
};

export function ResourcesCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: ResourcesCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-cyan-700"
      icon={<CalendarRangeIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <CalendarRangeIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((resource) => (
        <Link
          key={resource.id}
          href={resource.href}
          data-testid={`dashboard-resource-row-${resource.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-50">
            <CalendarRangeIcon className="h-3.5 w-3.5 text-cyan-700" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900 transition-colors group-hover:text-cyan-700">
              {resource.title}
            </p>
            <p className="mt-1 text-xs text-stone-500">{resource.subtitle}</p>
            <p className="mt-0.5 text-xs text-stone-400">{resource.statusLabel}</p>
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
