import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { getGroupById, listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
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
  const baseContext = { user: session.user };
  const selectedGroup = await getGroupById(baseContext, {
    groupId: resolvedParams.groupId,
  }).catch(() => null);

  if (!selectedGroup) {
    redirect("/dashboard");
  }

  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [groups, canAccessAdmin, adminNeighborhoods] = await Promise.all([
    listUserGroups(unscopedContext),
    hasNeighborhoodAdminRole(baseContext),
    listNeighborhoodAdminOptions(baseContext),
  ]);

  if (groups.length === 0) {
    redirect("/dashboard");
  }

  const selectedGroupFromNeighborhood = groups.find((group) => group.id === resolvedParams.groupId);

  if (!selectedGroupFromNeighborhood) {
    redirect("/dashboard");
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
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        selectedGroupId={resolvedParams.groupId}
        neighborhoods={adminNeighborhoods}
        dashboardLabel={t("dashboard")}
        canAccessAdmin={canAccessAdmin}
      />
      {children}
    </div>
  );
}
