import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { listGroupsPaged } from "@/services/groups";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function GroupsPage({
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

  const { items: groups, total } = await listGroupsPaged(
    { user: session.user },
    {
      query: query || undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const t = await getTranslations("admin.groups");

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
            href="/admin/groups/new"
            data-testid="admin-groups-add"
          >
            {t("addGroup")}
          </Link>
        ) : null}
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
          name="q"
          data-testid="admin-groups-search"
          placeholder={t("searchPlaceholder")}
          defaultValue={query}
        />
        <button
          className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="submit"
          data-testid="admin-groups-filter"
        >
          {t("filter")}
        </button>
      </form>

      <div className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
        {groups.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="admin-groups-table">
              <thead className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                <tr>
                  <th className="py-2">{t("table.name")}</th>
                  <th className="py-2">{t("table.address")}</th>
                  {session.user.role === "admin" ? (
                    <th className="py-2">{t("table.admin")}</th>
                  ) : null}
                  <th className="py-2 text-right">{t("table.action")}</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--foreground)]">
                {groups.map((group) => (
                  <tr
                    key={group.id}
                    className="border-t border-[color:var(--stroke)]"
                    data-testid={`admin-groups-row-${group.id}`}
                  >
                    <td className="py-3 font-medium">{group.name}</td>
                    <td className="py-3 text-[color:var(--muted)]">
                      {group.address ?? t("table.emptyAddress")}
                    </td>
                    {session.user.role === "admin" ? (
                      <td className="py-3 text-xs text-[color:var(--muted)]">
                        {group.adminUserId}
                      </td>
                    ) : null}
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        href={`/admin/groups/${group.id}`}
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
              href={`/admin/groups${buildQuery({ q: query || undefined, page: String(page - 1) })}`}
            >
              {t("pagination.prev")}
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
              href={`/admin/groups${buildQuery({ q: query || undefined, page: String(page + 1) })}`}
            >
              {t("pagination.next")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
