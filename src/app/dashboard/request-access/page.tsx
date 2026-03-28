import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";

import { DashboardHeader } from "@/components/dashboard-v2";
import { DashboardRequestAccess } from "@/components/access-requests/dashboard-request-access";
import { HelpContextPanel } from "@/components/help/HelpContextPanel";
import { HelpQuickAnswers } from "@/components/help/HelpQuickAnswers";
import {
  listContextHelpByScreen,
  listContextQuickAnswers,
  resolveHelpRole,
} from "@/lib/help-content";
import { listMyGroupAccessRequests } from "@/services/group-access-requests";
import { listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardRequestAccessPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const initialSlug =
    typeof resolvedSearchParams.slug === "string" ? resolvedSearchParams.slug.trim() : "";

  if (!session) {
    const params = new URLSearchParams({
      tab: "signup",
      next: initialSlug
        ? `/dashboard/request-access?slug=${encodeURIComponent(initialSlug)}`
        : "/dashboard/request-access",
    });
    redirect(`/login?${params.toString()}`);
  }

  const baseContext = { user: session.user };
  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [locale, t, tNav, groups, canAccessAdmin, adminNeighborhoods, requests] =
    await Promise.all([
      getLocale(),
      getTranslations("dashboard.requestAccess"),
      getTranslations("nav"),
      listUserGroups(unscopedContext),
      hasNeighborhoodAdminRole(baseContext),
      listNeighborhoodAdminOptions(baseContext),
      listMyGroupAccessRequests(baseContext),
    ]);
  const helpRole = resolveHelpRole({
    accountRole: session.user.role,
    hasNeighborhoodAdminAccess: canAccessAdmin,
  });

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <DashboardHeader
        user={{
          username: session.user.username,
          image: session.user.image,
          role: session.user.role,
        }}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        neighborhoods={adminNeighborhoods}
        dashboardLabel={tNav("dashboard")}
        canAccessAdmin={canAccessAdmin}
      />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
              {t("label")}
            </p>
            <h1 className="text-3xl font-semibold text-stone-900">{t("title")}</h1>
            <p className="text-sm text-[color:var(--muted)]">{t("subtitle")}</p>
          </div>
          <HelpContextPanel
            entries={listContextHelpByScreen({
              locale,
              screenKey: "dashboard-request-access",
              role: helpRole,
            })}
            screenKey="dashboard-request-access"
          />
        </header>

        <HelpQuickAnswers
          answers={listContextQuickAnswers({
            locale,
            screenKey: "dashboard-request-access",
            role: helpRole,
          })}
          title={t("helpQuickAnswersEyebrow")}
          articleLabel={t("helpQuickAnswersLink")}
        />

        <DashboardRequestAccess
          pending={requests.pending}
          history={requests.history}
          initialSlug={initialSlug}
          shareNeighborhoods={adminNeighborhoods}
        />
      </main>
    </div>
  );
}
