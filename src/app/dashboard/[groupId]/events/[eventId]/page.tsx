import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

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
  const event = await getEventById({ user: session.user }, { eventId: resolvedParams.eventId });
  const locale = await getLocale();
  const t = await getTranslations("dashboard.eventDetail");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{event.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            {formatDate(event.startsAt, locale)}
            {event.endsAt ? ` - ${formatDate(event.endsAt, locale)}` : ""}
          </p>
        </div>
        {session.user.role === "admin" ? (
          <Link
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`/admin/events/${event.id}`}
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
