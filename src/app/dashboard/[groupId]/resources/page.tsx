import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { listResourcesForGroup } from "@/services/resources";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentResourcesPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId } = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };

  const resources = await listResourcesForGroup(serviceContext, { groupId }).catch(() => null);
  const [t, tStatus] = await Promise.all([
    getTranslations("dashboard.resourcesPage"),
    getTranslations("status"),
  ]);
  if (!resources) {
    redirect(`/dashboard/${groupId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">{t("eyebrow")}</p>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-[color:var(--muted)]">{t("subtitle")}</p>
        </div>
        <Link
          href={`/dashboard/${groupId}/resources/reservations`}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          data-testid="dashboard-resources-my-reservations-link"
        >
          {t("links.myReservations")}
        </Link>
      </header>

      {resources.length === 0 ? (
        <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-8 text-sm text-[color:var(--muted)]" data-testid="dashboard-resources-empty">
          {t("empty")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource) => (
            <Link
              key={resource.id}
              href={`/dashboard/${groupId}/resources/${resource.id}`}
              className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm transition hover:border-[color:var(--accent)]"
              data-testid={`dashboard-resource-card-${resource.id}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{resource.name}</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {resource.description || resource.location || t("noDescription")}
                  </p>
                </div>
                <StatusBadge
                  variant={getResourceStatusVariant(resource.status) as never}
                  label={tStatus(resource.status)}
                />
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("cards.type")}</p>
                  <p className="mt-1 font-semibold text-stone-900">{resource.type || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("cards.capacity")}</p>
                  <p className="mt-1 font-semibold text-stone-900">{resource.capacity ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("cards.upcoming")}</p>
                  <p className="mt-1 font-semibold text-stone-900">
                    {resource.groupUpcomingReservations}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
