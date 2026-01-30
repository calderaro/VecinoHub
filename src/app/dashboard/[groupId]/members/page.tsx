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
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const members = await listGroupMembers(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const canManage =
    session.user.role === "admin" || group.adminUserId === session.user.id;
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
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-members-list"
      >
        <GroupMembers
          groupId={group.id}
          members={members}
          canManage={canManage}
        />
      </section>
    </div>
  );
}
