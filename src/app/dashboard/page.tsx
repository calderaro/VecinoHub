import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20">
          <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
              VecinoHub
            </p>
            <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              {t("body")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  redirect(`/dashboard/${groups[0].id}`);
}
