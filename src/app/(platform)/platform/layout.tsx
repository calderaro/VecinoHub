import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { listUserGroups } from "@/services/groups";
import { listNeighborhoodAdminOptions } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin" && session.user.role !== "platform_admin") {
    redirect("/");
  }

  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [t, adminNeighborhoods, groups] = await Promise.all([
    getTranslations("userMenu"),
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
        dashboardLabel={t("platformPanel")}
        homeHref="/platform"
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        neighborhoods={adminNeighborhoods}
        canAccessAdmin
      />
      {children}
    </div>
  );
}
