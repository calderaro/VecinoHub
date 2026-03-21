import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { NoGroupState } from "@/components/dashboard-v2";
import { UserMenu } from "@/components/user-menu";
import { listMyInvites } from "@/services/group-invites";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardGroupSelectorPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const baseContext = { user: session.user };
  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [tNav, tDashboard, tEmpty, tUserMenu, canAccessAdmin, groups, adminNeighborhoods, invites] = await Promise.all([
    getTranslations("nav"),
    getTranslations("dashboard.groupSelector"),
    getTranslations("dashboard.empty"),
    getTranslations("userMenu"),
    hasNeighborhoodAdminRole(baseContext),
    listUserGroups(unscopedContext),
    listNeighborhoodAdminOptions(baseContext),
    listMyInvites(baseContext),
  ]);

  if (groups.length === 0 && invites.pending.length > 0) {
    redirect("/dashboard/invites");
  }

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-40 h-14 border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="dashboard-v2-focus group flex items-center gap-2.5 rounded-sm"
            aria-label={`VecinoHub - ${tNav("dashboard")}`}
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
                {tNav("dashboard")}
              </span>
            </div>
          </Link>

          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
            neighborhoods={adminNeighborhoods}
            showAdminLink={canAccessAdmin}
            variant="dashboard-v2"
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
            VecinoHub
          </p>
          <h1 className="text-3xl font-bold text-stone-900">{tDashboard("title")}</h1>
          <p className="mt-2 text-sm text-stone-500">
            {tDashboard("subtitle")}
          </p>
        </div>

        {groups.length === 0 ? (
          <NoGroupState
            eyebrow="VecinoHub"
            title={tEmpty("title")}
            body={tEmpty("body")}
            statusLabel={tEmpty("status")}
            helpText={tEmpty("help")}
            signOutLabel={tUserMenu("signOut")}
            signingOutLabel={tUserMenu("signingOut")}
            fullScreen={false}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2" data-testid="dashboard-group-list">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/${group.id}`}
                className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-teal-300 hover:bg-teal-50/40"
                data-testid={`dashboard-group-card-${group.id}`}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
                  {group.neighborhoodName}
                </p>
                <p className="text-base font-semibold text-stone-900">{group.name}</p>
                <p className="mt-1 text-xs text-stone-500">
                  {group.address ?? tDashboard("emptyAddress")}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
