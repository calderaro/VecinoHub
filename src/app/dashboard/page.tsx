import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { NoGroupState } from "@/components/dashboard-v2";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardIndexPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const groups = await listUserGroups({ user: session.user });

  if (groups.length === 0) {
    const t = await getTranslations("dashboard.empty");
    const tUserMenu = await getTranslations("userMenu");
    return (
      <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
        <NoGroupState
          eyebrow="VecinoHub"
          title={t("title")}
          body={t("body")}
          statusLabel={t("status")}
          helpText={t("help")}
          signOutLabel={tUserMenu("signOut")}
          signingOutLabel={tUserMenu("signingOut")}
        />
      </div>
    );
  }

  redirect(`/dashboard/${groups[0].id}`);
}
