import Link from "next/link";

import { UserMenu } from "@/components/user-menu";

type GroupOption = {
  id: string;
  name: string;
};

type NeighborhoodOption = {
  id: string;
  name: string;
};

type DashboardHeaderProps = {
  user: {
    username: string | null;
    image: string | null;
    role: "user" | "admin" | "platform_admin";
  };
  groups?: GroupOption[];
  selectedGroupId?: string;
  neighborhoods?: NeighborhoodOption[];
  selectedNeighborhoodId?: string | null;
  dashboardLabel: string;
  canAccessAdmin?: boolean;
  homeHref?: string;
};

export function DashboardHeader({
  user,
  groups,
  selectedGroupId,
  neighborhoods,
  selectedNeighborhoodId,
  dashboardLabel,
  canAccessAdmin,
  homeHref = "/dashboard",
}: DashboardHeaderProps) {
  const dashboardHref = selectedGroupId ? `/dashboard/${selectedGroupId}` : homeHref;

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={dashboardHref}
          className="dashboard-v2-focus group flex items-center gap-2.5 rounded-sm"
          aria-label={`VecinoHub - ${dashboardLabel}`}
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-teal-600">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 1.5L1.5 6v8h4.5v-4.5h4V14h4.5V6L8 1.5z" fill="white" />
            </svg>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-stone-900">VecinoHub</span>
            <span className="hidden text-sm text-stone-300 sm:inline" aria-hidden="true">
              /
            </span>
            <span className="hidden text-sm font-medium text-stone-500 transition-colors group-hover:text-stone-700 sm:inline">
              {dashboardLabel}
            </span>
          </div>
        </Link>

        <UserMenu
          user={user}
          groups={groups}
          selectedGroupId={selectedGroupId}
          neighborhoods={neighborhoods}
          selectedNeighborhoodId={selectedNeighborhoodId}
          showAdminLink={canAccessAdmin}
          variant="dashboard-v2"
        />
      </div>
    </header>
  );
}
