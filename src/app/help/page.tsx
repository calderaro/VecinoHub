import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { HelpCenterClient } from "@/components/help/HelpCenterClient";
import { listHelpArticles } from "@/lib/help-content";
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

export default async function HelpPage() {
  const session = await getSession();

  if (!session) {
    const params = new URLSearchParams({
      tab: "signup",
      next: "/help",
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

  const preferredAudience = session.user.role === "user" ? "resident" : "admin";
  const articles = listHelpArticles(locale);

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
        dashboardLabel={t("navLabel")}
        canAccessAdmin={canAccessAdmin}
      />

      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <HelpCenterClient
          articles={articles}
          preferredAudience={preferredAudience}
          showSpanishOnlyNotice={locale !== "es"}
        />
      </main>
    </div>
  );
}
