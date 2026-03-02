import { UsersIcon } from "lucide-react";

import { SectionCard } from "./SectionCard";
import { StatusChip } from "./StatusChip";

type MemberCardItem = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "platform_admin" | "user";
  roleLabel: string;
  avatarInitial: string;
  avatarColorClass: string;
};

type MembersCardProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref: string;
  emptyTitle: string;
  emptyBody: string;
  totalCount: number;
  items: MemberCardItem[];
  testId?: string;
};

export function MembersCard({
  title,
  viewAllLabel,
  viewAllHref,
  emptyTitle,
  emptyBody,
  totalCount,
  items,
  testId,
}: MembersCardProps) {
  const isEmpty = items.length === 0;

  return (
    <SectionCard
      title={title}
      count={totalCount}
      iconClassName="text-rose-600"
      icon={<UsersIcon className="h-4 w-4" />}
      actionHref={viewAllHref}
      actionLabel={viewAllLabel}
      isEmpty={isEmpty}
      testId={testId}
      emptyState={
        <>
          <UsersIcon className="h-8 w-8 text-stone-300" aria-hidden="true" />
          <p className="text-sm font-medium text-stone-500">{emptyTitle}</p>
          <p className="text-xs text-stone-400">{emptyBody}</p>
        </>
      }
    >
      {items.map((member) => (
        <div key={member.id} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
          <div
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${member.avatarColorClass}`}
            aria-hidden="true"
          >
            <span className="text-xs font-semibold text-white">{member.avatarInitial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-stone-900">{member.name}</p>
            <p className="truncate text-xs text-stone-400">{member.email}</p>
          </div>
          <StatusChip variant={member.role} label={member.roleLabel} />
        </div>
      ))}
    </SectionCard>
  );
}
