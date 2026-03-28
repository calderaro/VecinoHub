import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, CalendarDaysIcon, MapPinIcon, PencilIcon } from "lucide-react";

import { EventAdminActions } from "@/components/events/event-admin-actions";
import { StatusBadge } from "@/components/ui-v3";
import { getEventById } from "@/services/events";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { formatPortDate, formatPortDateTime, formatPortTime } from "@/lib/port-time";
import { getSession } from "@/server/auth";

export default async function AdminEventDetailPage({
  params,
}: {
  params:
    | { neighborhoodId: string; eventId: string }
    | Promise<{ neighborhoodId: string; eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };
  const [event, neighborhood] = await Promise.all([
    getEventById(serviceContext, { eventId: resolvedParams.eventId }),
    getNeighborhoodById(serviceContext, { neighborhoodId: resolvedParams.neighborhoodId }).catch(
      () => null
    ),
  ]);
  if (!neighborhood) {
    redirect(adminBasePath);
  }
  const locale = await getLocale();
  const t = await getTranslations("admin.eventDetail");
  const now = new Date();
  const eventStartsAt = new Date(event.startsAt);
  const statusVariant = eventStartsAt.getTime() >= now.getTime() ? "upcoming" : "completed";
  const eventWithMeta = event as typeof event & { creatorName?: string };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href={`${adminBasePath}/events`}
        data-testid="event-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                Neighborhood Event
              </p>
              <h1 className="mb-2 text-xl font-bold text-stone-900">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  variant={statusVariant}
                  label={statusVariant === "upcoming" ? "Upcoming" : "Completed"}
                />
                <span className="text-xs text-stone-400">by {eventWithMeta.creatorName ?? "-"}</span>
                  <span className="text-xs text-stone-400">
                  {formatPortDateTime(event.startsAt, neighborhood.timeZone, locale)}
                </span>
                {event.endsAt ? (
                  <span className="text-xs text-stone-400">
                    Ends {formatPortDateTime(event.endsAt, neighborhood.timeZone, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`${adminBasePath}/events/${event.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                data-testid="event-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <EventAdminActions eventId={event.id} adminBasePath={adminBasePath} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Date</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {formatPortDate(event.startsAt, neighborhood.timeZone, locale)}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Time</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {formatPortTime(event.startsAt, neighborhood.timeZone, locale)}
              {event.endsAt ? ` - ${formatPortTime(event.endsAt, neighborhood.timeZone, locale)}` : ""}
            </p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("location")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {event.location ?? t("tbd")}
            </p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <div className="flex items-center gap-2 text-stone-500">
            <CalendarDaysIcon className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-wide">{t("description")}</p>
          </div>
          <p className="text-sm leading-relaxed text-stone-600">
            {event.description || t("noDescription")}
          </p>
          {event.location ? (
            <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-50 px-2.5 py-1.5 text-xs text-stone-500">
              <MapPinIcon className="h-3.5 w-3.5" />
              {event.location}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
