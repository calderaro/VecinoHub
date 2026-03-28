import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AvailabilityCalendar } from "@/components/resources/availability-calendar";
import { StatusBadge } from "@/components/ui-v3";
import { getResourceStatusVariant } from "@/components/resources/utils";
import { getResourceAdminDetail } from "@/services/resources";
import { getSession } from "@/server/auth";

export default async function AdminResourceDetailPage({
  params,
}: {
  params:
    | { neighborhoodId: string; resourceId: string }
    | Promise<{ neighborhoodId: string; resourceId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, resourceId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [locale, t, tStatus, tReasons, resource] = await Promise.all([
    getLocale(),
    getTranslations("admin.resources.detail"),
    getTranslations("status"),
    getTranslations("resourcesUi.blockReasons"),
    getResourceAdminDetail(serviceContext, { resourceId }).catch(() => null),
  ]);
  if (!resource) {
    redirect(`/admin/${neighborhoodId}/resources`);
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
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/${neighborhoodId}/resources/reservations`}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {t("links.reservations")}
          </Link>
          <Link
            href={`/admin/${neighborhoodId}/resources/${resourceId}/edit`}
            className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            data-testid="admin-resource-edit"
          >
            {t("links.edit")}
          </Link>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              {t("summary.title")}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("summary.type")}</dt>
                <dd className="font-medium text-stone-900">{resource.type || "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("summary.capacity")}</dt>
                <dd className="font-medium text-stone-900">{resource.capacity ?? "—"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("summary.upcomingReservations")}</dt>
                <dd className="font-medium text-stone-900">{resource.upcomingReservations.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("summary.upcomingBlocks")}</dt>
                <dd className="font-medium text-stone-900">{resource.upcomingBlocks.length}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              {t("rules.title")}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.advanceWindow")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.minAdvanceHours}h / {resource.rules.maxAdvanceDays}d
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.duration")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.minDurationMinutes} - {resource.rules.maxDurationMinutes} min
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.buffers")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.bufferBeforeMinutes} / {resource.rules.bufferAfterMinutes} min
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.concurrentReservations")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.maxConcurrentReservations}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-stone-500">{t("rules.requireNoDebt")}</dt>
                <dd className="font-medium text-stone-900">
                  {resource.rules.requireNoDebt ? t("yes") : t("no")}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              {t("upcomingBlocks.title")}
            </h2>
            <div className="mt-4 space-y-2 text-sm">
              {resource.upcomingBlocks.length === 0 ? (
                <p className="text-stone-500">{t("upcomingBlocks.empty")}</p>
              ) : (
                resource.upcomingBlocks.slice(0, 3).map((block) => (
                  <div key={block.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <p className="font-medium text-stone-900">{tReasons(block.reason)}</p>
                    <p className="text-xs text-stone-500">
                      {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: resource.timeZone,
                      }).format(block.startAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
              {t("calendarTitle")}
            </h2>
            <div className="mt-4">
              <AvailabilityCalendar
                entries={resource.calendar.entries}
                locale={locale}
                timeZone={resource.timeZone}
                showAdminDetails
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
