import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, CalendarDaysIcon, MapPinIcon, PencilIcon } from "lucide-react";

import { EventAdminActions } from "@/components/events/event-admin-actions";
import { StatusBadge } from "@/components/ui-v3";
import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDateTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDate(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatTime(value: Date | string, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function AdminEventDetailPage({
  params,
}: {
  params: { eventId: string } | Promise<{ eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const event = await getEventById({ user: session.user }, resolvedParams);
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
        href="/admin/events"
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
                  {formatDateTime(event.startsAt, locale)}
                </span>
                {event.endsAt ? (
                  <span className="text-xs text-stone-400">
                    Ends {formatDateTime(event.endsAt, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/admin/events/${event.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                data-testid="event-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <EventAdminActions eventId={event.id} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Date</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{formatDate(event.startsAt, locale)}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">Time</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">
              {formatTime(event.startsAt, locale)}
              {event.endsAt ? ` - ${formatTime(event.endsAt, locale)}` : ""}
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
