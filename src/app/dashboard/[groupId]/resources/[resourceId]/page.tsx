import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AvailabilityCalendar } from "@/components/resources/availability-calendar";
import { StatusBadge } from "@/components/ui-v3";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { getResourceDetailForGroup } from "@/services/resources";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentResourceDetailPage({
  params,
}: {
  params:
    | { groupId: string; resourceId: string }
    | Promise<{ groupId: string; resourceId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId, resourceId } = await Promise.resolve(params);
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

  const [locale, t, tStatus, resource] = await Promise.all([
    getLocale(),
    getTranslations("dashboard.resourceDetail"),
    getTranslations("status"),
    getResourceDetailForGroup(serviceContext, { groupId, resourceId }).catch(() => null),
  ]);

  if (!resource) {
    redirect(`/dashboard/${groupId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{resource.neighborhoodName}</p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-stone-900">{resource.name}</h1>
            <StatusBadge
              variant={getResourceStatusVariant(resource.status) as never}
              label={tStatus(resource.status)}
            />
          </div>
          <p className="mt-2 text-sm text-stone-500">
            {resource.description || t("noDescription")}
          </p>
          <p className="mt-1 text-xs text-stone-400">
            {resource.location || t("noLocation")} · {resource.timeZone}
          </p>
        </div>
        <Link
          href={`/dashboard/${groupId}/resources/${resourceId}/reserve`}
          className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          data-testid="dashboard-resource-reserve"
        >
          {t("reserve")}
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">{t("rules.title")}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.advanceNotice")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.minAdvanceHours}h to {resource.rules.maxAdvanceDays}d
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.duration")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.minDurationMinutes} - {resource.rules.maxDurationMinutes} min
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.monthlyLimit")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.maxReservationsPerMonth ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.yearlyLimit")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.maxReservationsPerYear ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.cancellationCutoff")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.cancellationLimitHours ?? "—"}
                </dd>
              </div>
            </dl>
            {resource.usageRules ? (
              <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-600">
                {resource.usageRules}
              </div>
            ) : null}
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              {t("availability")}
            </h2>
            <div className="mt-4">
              <AvailabilityCalendar
                entries={resource.calendar.entries}
                locale={locale}
                timeZone={resource.timeZone}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
