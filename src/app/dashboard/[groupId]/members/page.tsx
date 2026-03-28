import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { HelpContextPanel } from "@/components/help/HelpContextPanel";
import { listGroupAccessRequests } from "@/services/group-access-requests";
import { GroupMembers } from "@/components/groups/group-members";
import { listContextHelpByScreen } from "@/lib/help-content";
import { listGroupInvites } from "@/services/group-invites";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function MembersPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const [group, members] = await Promise.all([
    getGroupById(serviceContext, {
      groupId: resolvedParams.groupId,
    }),
    listGroupMembers(serviceContext, {
      groupId: resolvedParams.groupId,
    }),
  ]);
  const neighborhood = await getNeighborhoodById(serviceContext, {
    neighborhoodId: group.neighborhoodId,
  });
  const invites = group.viewerCanManage
    ? await listGroupInvites(serviceContext, {
        groupId: resolvedParams.groupId,
      })
    : { pending: [], history: [] };
  const accessRequests = group.viewerCanManage
    ? await listGroupAccessRequests(serviceContext, {
        groupId: resolvedParams.groupId,
      })
    : { pending: [], history: [] };
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.membersPage"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
            {t("label")}
          </p>
          <h1 className="text-3xl font-semibold">
            {t("title", { name: group.name })}
          </h1>
          <p className="text-sm text-[color:var(--muted)]">
            {t("subtitle")}
          </p>
        </div>
        <HelpContextPanel entries={listContextHelpByScreen(locale, "dashboard-members")} />
      </header>

      <GroupMembers
        groupId={group.id}
        members={members}
        invites={invites.pending}
        accessRequests={accessRequests.pending}
        canManage={group.viewerCanManage}
        viewerUserId={session.user.id}
        viewerMembershipRole={group.viewerMembershipRole}
        timeZone={neighborhood.timeZone}
      />
    </div>
  );
}
