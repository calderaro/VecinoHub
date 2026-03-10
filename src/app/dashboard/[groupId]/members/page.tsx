import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GroupMembers } from "@/components/groups/group-members";
import { getGroupById, listGroupMembers } from "@/services/groups";
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
  const t = await getTranslations("dashboard.membersPage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold">
          {t("title", { name: group.name })}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("subtitle")}
        </p>
      </header>

      <section
        className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm"
        data-testid="dashboard-members-list"
      >
        <GroupMembers
          groupId={group.id}
          members={members}
          canManage={group.viewerCanManage}
        />
      </section>
    </div>
  );
}
