import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { listEventsPaged } from "@/services/events";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { items: events, total } = await listEventsPaged(
    { user: session.user },
    {
      query: query || undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const locale = await getLocale();
  const t = await getTranslations("admin.eventsList");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
            {t("label")}
          </p>
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            {t("subtitle")}
          </p>
        </div>
        {session.user.role === "admin" ? (
          <Link
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)]"
            href="/admin/events/new"
          >
            {t("addEvent")}
          </Link>
        ) : null}
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
          name="q"
          placeholder={t("searchPlaceholder")}
          defaultValue={query}
        />
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="submit"
        >
          {t("filter")}
        </button>
      </form>

      <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        {events.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                <tr>
                  <th className="py-2">{t("table.title")}</th>
                  <th className="py-2">{t("table.starts")}</th>
                  <th className="py-2">{t("table.location")}</th>
                  <th className="py-2 text-right">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--foreground)]">
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-white/10">
                    <td className="py-3 font-medium">{event.title}</td>
                    <td className="py-3 text-[color:var(--muted)]">
                      {formatDate(event.startsAt, locale)}
                    </td>
                    <td className="py-3 text-[color:var(--muted)]">
                      {event.location ?? t("table.emptyLocation")}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        href={`/admin/events/${event.id}`}
                      >
                        {t("table.view")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        <span>{t("pagination.pageOf", { page, total: totalPages })}</span>
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin/events${buildQuery({ q: query || undefined, page: String(page - 1) })}`}
            >
              {t("pagination.prev")}
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin/events${buildQuery({ q: query || undefined, page: String(page + 1) })}`}
            >
              {t("pagination.next")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
