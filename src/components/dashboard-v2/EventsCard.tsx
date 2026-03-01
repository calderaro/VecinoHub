import Link from "next/link";
import { CalendarIcon, MapPinIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

type EventCardItem = {
  id: string;
  href: string;
  title: string;
  month: string;
  day: string;
  dateTimeLabel: string;
  location: string | null;
};

type EventsCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: EventCardItem[];
  testId?: string;
};

export function EventsCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: EventsCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-blue-600"
      icon={<CalendarIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <CalendarIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((event) => (
        <Link
          key={event.id}
          href={event.href}
          data-testid={`dashboard-events-row-${event.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
            <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-blue-500">
              {event.month}
            </span>
            <span className="text-sm font-bold leading-tight text-blue-700">{event.day}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900 transition-colors group-hover:text-blue-700">
              {event.title}
            </p>
            <div className="mt-0.5 flex items-center gap-1">
              <CalendarIcon className="h-3 w-3 flex-shrink-0 text-stone-400" aria-hidden="true" />
              <span className="text-xs text-stone-500">{event.dateTimeLabel}</span>
            </div>
            {event.location ? (
              <div className="mt-0.5 flex items-center gap-1">
                <MapPinIcon className="h-3 w-3 flex-shrink-0 text-stone-400" aria-hidden="true" />
                <span className="truncate text-xs text-stone-400">{event.location}</span>
              </div>
            ) : null}
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
