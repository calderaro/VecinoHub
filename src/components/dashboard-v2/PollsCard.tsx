import Link from "next/link";
import { BarChart2Icon } from "lucide-react";

import { SectionCard } from "./SectionCard";
import { StatusChip } from "./StatusChip";

type PollCardItem = {
  id: string;
  href: string;
  title: string;
  description: string | null;
  creatorName: string | null;
  status: "draft" | "active" | "closed";
  statusLabel: string;
};

type PollsCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: PollCardItem[];
  testId?: string;
};

export function PollsCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: PollsCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-violet-600"
      icon={<BarChart2Icon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <BarChart2Icon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((poll) => (
        <Link
          key={poll.id}
          href={poll.href}
          data-testid={`dashboard-polls-row-${poll.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-violet-50">
            <BarChart2Icon className="h-3.5 w-3.5 text-violet-600" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 flex-1 text-sm font-medium text-stone-900 transition-colors group-hover:text-violet-700">
                {poll.title}
              </p>
              <StatusChip variant={poll.status} label={poll.statusLabel} />
            </div>

            {poll.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{poll.description}</p>
            ) : null}

            {poll.creatorName ? <p className="mt-0.5 text-xs text-stone-400">{poll.creatorName}</p> : null}
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
