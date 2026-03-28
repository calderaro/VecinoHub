import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { HelpCenterClient } from "@/components/help/HelpCenterClient";
import { HelpViewTracker } from "@/components/help/HelpViewTracker";
import { listHelpArticles, resolveHelpRole } from "@/lib/help-content";
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

export default async function HelpPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const source =
    typeof resolvedSearchParams.source === "string" && resolvedSearchParams.source.trim()
      ? resolvedSearchParams.source.trim()
      : "direct";

  if (!session) {
    const params = new URLSearchParams({
      tab: "signup",
      next: `/help?source=${encodeURIComponent(source)}`,
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

  const locale = await getLocale();
  const [groups, canAccessAdmin, adminNeighborhoods, t] = await Promise.all([
    listUserGroups(unscopedContext),
    hasNeighborhoodAdminRole(baseContext),
    listNeighborhoodAdminOptions(baseContext),
    getTranslations("help"),
  ]);

  const helpRole = resolveHelpRole({
    accountRole: session.user.role,
    hasNeighborhoodAdminAccess: canAccessAdmin,
  });
  const articles = listHelpArticles(locale);

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <HelpViewTracker eventName="help_center_opened" source={source} />
      <DashboardHeader
        user={{
          username: session.user.username,
          image: session.user.image,
          role: session.user.role,
        }}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        neighborhoods={adminNeighborhoods}
        dashboardLabel={t("navLabel")}
        canAccessAdmin={canAccessAdmin}
      />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <HelpCenterClient
          articles={articles}
          helpRole={helpRole}
          showSpanishOnlyNotice={locale !== "es"}
        />
      </main>
    </div>
  );
}
