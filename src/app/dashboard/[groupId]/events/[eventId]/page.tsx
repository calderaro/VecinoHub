import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { formatPortDateTime } from "@/lib/port-time";
import { getEventById } from "@/services/events";
import { getGroupById } from "@/services/groups";
import { getNeighborhoodById, hasNeighborhoodAdminRole } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function NeighborEventDetailPage({
  params,
}: {
  params: { groupId: string; eventId: string } | Promise<{ groupId: string; eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId: resolvedParams.groupId });
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  const [event, neighborhood, canAccessAdmin] = await Promise.all([
    getEventById(serviceContext, { eventId: resolvedParams.eventId }),
    getNeighborhoodById(serviceContext, { neighborhoodId: group.neighborhoodId }).catch(() => null),
    hasNeighborhoodAdminRole(baseContext),
  ]);
  if (!neighborhood) {
    redirect(`/dashboard/${resolvedParams.groupId}/events`);
  }
  const adminBasePath = `/admin/${group.neighborhoodId}`;
  const locale = await getLocale();
  const t = await getTranslations("dashboard.eventDetail");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{event.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            {formatPortDateTime(event.startsAt, neighborhood.timeZone, locale)}
            {event.endsAt ? ` - ${formatPortDateTime(event.endsAt, neighborhood.timeZone, locale)}` : ""}
          </p>
        </div>
        {canAccessAdmin ? (
          <Link
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`${adminBasePath}/events/${event.id}`}
          >
            {t("adminView")}
          </Link>
        ) : null}
      </header>

      <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="grid gap-4 text-sm text-[color:var(--foreground)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              {t("location")}
            </p>
            <p className="mt-1">{event.location ?? t("tbd")}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              {t("description")}
            </p>
            <p className="mt-1 text-[color:var(--muted-strong)]">
              {event.description || t("noDescription")}
            </p>
          </div>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] hover:text-[color:var(--accent)]"
        href={`/dashboard/${resolvedParams.groupId}/events`}
      >
        {t("back")}
      </Link>
    </div>
  );
}
