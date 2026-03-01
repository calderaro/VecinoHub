import Link from "next/link";
import { FileTextIcon, InboxIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";

type PostCardItem = {
  id: string;
  href: string;
  title: string;
  snippet: string;
  author: string;
  dateLabel: string;
  avatarInitial: string;
  avatarColorClass: string;
};

type PostsCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: PostCardItem[];
  testId?: string;
};

export function PostsCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: PostsCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-teal-600"
      icon={<FileTextIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <InboxIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((post) => (
        <Link
          key={post.id}
          href={post.href}
          data-testid={`dashboard-posts-row-${post.id}`}
          className="group flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
        >
          <div
            className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${post.avatarColorClass}`}
            aria-hidden="true"
          >
            <span className="text-xs font-semibold text-white">{post.avatarInitial}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900 transition-colors group-hover:text-teal-700">
              {post.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{post.snippet}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-stone-400">{post.author}</span>
              <span className="text-xs text-stone-300" aria-hidden="true">
                ·
              </span>
              <time className="text-xs text-stone-400">{post.dateLabel}</time>
            </div>
          </div>
        </Link>
      ))}
    </SectionCard>
  );
}
