import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const groups = await listUserGroups({ user: session.user });

  if (groups.length === 0) {
    redirect("/dashboard");
  }

  const selectedGroup = groups.find((group) => group.id === resolvedParams.groupId);

  if (!selectedGroup) {
    redirect(`/dashboard/${groups[0].id}`);
  }

  const t = await getTranslations("nav");

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <DashboardHeader
        user={{
          username: session.user.username,
          image: session.user.image,
          role: session.user.role,
        }}
        groupName={selectedGroup.name}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        selectedGroupId={resolvedParams.groupId}
        dashboardLabel={t("dashboard")}
      />
      {children}
    </div>
  );
}
