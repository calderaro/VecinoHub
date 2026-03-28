import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { HelpContextPanel } from "@/components/help/HelpContextPanel";
import { DashboardInvitesInbox } from "@/components/invites/dashboard-invites-inbox";
import { listContextHelpByScreen } from "@/lib/help-content";
import { listMyInvites, getInviteByTokenForSession } from "@/services/group-invites";
import { listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function DashboardInvitesPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const inviteToken =
    typeof resolvedSearchParams.invite === "string" ? resolvedSearchParams.invite : undefined;

  if (!session) {
    const params = new URLSearchParams({
      tab: "signup",
      next: inviteToken
        ? `/dashboard/invites?invite=${encodeURIComponent(inviteToken)}`
        : "/dashboard/invites",
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

  const [locale, t, tNav, groups, canAccessAdmin, adminNeighborhoods, invites, tokenStatus] =
    await Promise.all([
      getLocale(),
      getTranslations("dashboard.invites"),
      getTranslations("nav"),
      listUserGroups(unscopedContext),
      hasNeighborhoodAdminRole(baseContext),
      listNeighborhoodAdminOptions(baseContext),
      listMyInvites(baseContext),
      inviteToken ? getInviteByTokenForSession(baseContext, { token: inviteToken }) : null,
    ]);

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
          <HelpContextPanel entries={listContextHelpByScreen(locale, "dashboard-invites")} />
        </header>

        <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm">
          <DashboardInvitesInbox
            pending={invites.pending}
            history={invites.history}
            highlightedInviteId={tokenStatus?.kind === "match" ? tokenStatus.inviteId : null}
            showMismatchWarning={tokenStatus?.kind === "mismatch"}
          />
        </section>
      </main>
    </div>
  );
}
