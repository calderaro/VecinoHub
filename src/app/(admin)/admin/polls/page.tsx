import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listPollsPaged } from "@/services/polls";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function PollsPage({
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
  const status =
    typeof resolvedSearchParams.status === "string"
      ? resolvedSearchParams.status
      : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { items: polls, total } = await listPollsPaged(
    { user: session.user },
    {
      query: query || undefined,
      status:
        session.user.role === "admin" && status
          ? (status as "draft" | "active" | "closed")
          : undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const t = await getTranslations("admin.polls");
  const tStatus = await getTranslations("status");

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
            className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
            href="/admin/polls/new"
            data-testid="admin-polls-add"
          >
            {t("addPoll")}
          </Link>
        ) : null}
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
          name="q"
          data-testid="admin-polls-search"
          placeholder={t("searchPlaceholder")}
          defaultValue={query}
        />
        {session.user.role === "admin" ? (
          <select
            className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            name="status"
            data-testid="admin-polls-status"
            defaultValue={status}
          >
            <option value="">{t("statusAll")}</option>
            <option value="draft">{tStatus("draft")}</option>
            <option value="active">{tStatus("active")}</option>
            <option value="closed">{tStatus("closed")}</option>
          </select>
        ) : null}
        <button
          className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="submit"
          data-testid="admin-polls-filter"
        >
          {t("filter")}
        </button>
      </form>

      <div className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
        {polls.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="admin-polls-table">
              <thead className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                <tr>
                  <th className="py-2">{t("table.title")}</th>
                  <th className="py-2">{t("table.status")}</th>
                  <th className="py-2 text-right">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--foreground)]">
                {polls.map((poll) => (
                  <tr
                    key={poll.id}
                    className="border-t border-[color:var(--stroke)]"
                    data-testid={`admin-polls-row-${poll.id}`}
                  >
                    <td className="py-3 font-medium">{poll.title}</td>
                    <td className="py-3 text-[color:var(--muted)] capitalize">
                      {tStatus(poll.status)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        href={`/admin/polls/${poll.id}`}
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
              className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
              href={`/admin/polls${buildQuery({ q: query || undefined, status: status || undefined, page: String(page - 1) })}`}
            >
              {t("pagination.prev")}
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
              href={`/admin/polls${buildQuery({ q: query || undefined, status: status || undefined, page: String(page + 1) })}`}
            >
              {t("pagination.next")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
