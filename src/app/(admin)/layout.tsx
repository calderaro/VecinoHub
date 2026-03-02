import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const hasAdminAccess = await hasNeighborhoodAdminRole({ user: session.user });
  if (!hasAdminAccess) {
    redirect("/");
  }

  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [t, adminNeighborhoods, groups] = await Promise.all([
    getTranslations("admin.nav"),
    listNeighborhoodAdminOptions({ user: session.user }),
    listUserGroups(unscopedContext),
  ]);

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <DashboardHeader
        user={{
          username: session.user.username,
          image: session.user.image,
          role: session.user.role,
        }}
        dashboardLabel={t("label")}
        homeHref="/admin"
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        neighborhoods={adminNeighborhoods}
        canAccessAdmin
      />
      {children}
    </div>
  );
}
