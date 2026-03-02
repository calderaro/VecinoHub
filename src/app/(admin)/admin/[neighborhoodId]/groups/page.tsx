import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronDownIcon, UsersIcon } from "lucide-react";

import { SearchInput, StatusBadge } from "@/components/ui-v3";
import { getGroupMemberCounts, listGroupsPaged } from "@/services/groups";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function GroupsPage({
  params,
  searchParams,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
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

  const { items: rawGroups, total } = await listGroupsPaged(
    serviceContext,
    {
      query: query || undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const groups = rawGroups;

  const memberCounts = await getGroupMemberCounts(
    serviceContext,
    { groupIds: groups.map((group) => group.id) }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const t = await getTranslations("admin.groups");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{total} total groups</p>
        </div>
        <Link
          className="vh-v3-focus rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          href={`${adminBasePath}/groups/new`}
          data-testid="admin-groups-add"
        >
          + New Group
        </Link>
      </header>

      <form className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm" method="get">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              defaultValue={query}
              placeholder="Search groups..."
              testId="admin-groups-search"
            />
          </div>
          <div className="relative">
            <select
              className="vh-v3-focus appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
              name="status"
              data-testid="admin-groups-status"
              defaultValue={status}
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {groups.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-stone-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-groups-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Group
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 sm:table-cell">
                    Admin
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                    Members
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {groups.map((group) => {
                  const groupWithMeta = group as typeof group & { adminName?: string; createdAt?: Date | string };
                  const memberCount = memberCounts.get(group.id) ?? 0;
                  const statusVariant = memberCount > 0 ? "active" : "inactive";

                  return (
                    <tr
                      key={group.id}
                      className="transition-colors hover:bg-stone-50"
                      data-testid={`admin-groups-row-${group.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`${adminBasePath}/groups/${group.id}`}
                          className="group flex items-center gap-2.5"
                          data-testid={`group-list-detail-${group.id}`}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                            <UsersIcon className="h-3.5 w-3.5 text-teal-500" />
                          </div>
                          <p className="font-medium text-stone-900 transition-colors group-hover:text-teal-700">
                            {group.name}
                          </p>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-600 sm:table-cell">
                        {groupWithMeta.adminName ?? group.adminUserId}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          variant={statusVariant}
                          label={statusVariant === "active" ? "Active" : "Inactive"}
                        />
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-600 md:table-cell">{memberCount}</td>
                      <td className="hidden px-4 py-3.5 text-stone-400 lg:table-cell">
                        {formatDate(groupWithMeta.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5 text-xs text-stone-400">
          <p>{groups.length} of {total} groups</p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`${adminBasePath}/groups${buildQuery({ q: query || undefined, status: status || undefined, page: String(page - 1) })}`}
              >
                Prev
              </Link>
            ) : null}
            <span className="px-1.5 text-xs font-medium text-stone-500">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`${adminBasePath}/groups${buildQuery({ q: query || undefined, status: status || undefined, page: String(page + 1) })}`}
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
