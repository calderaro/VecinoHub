import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ChevronDownIcon, ListChecksIcon } from "lucide-react";

import { SearchInput, StatusBadge } from "@/components/ui-v3";
import { getPollVoteCounts, listPollsPaged } from "@/services/polls";
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

export default async function PollsPage({
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

  const { items: polls, total } = await listPollsPaged(
    serviceContext,
    {
      query: query || undefined,
      status: status ? (status as "draft" | "active" | "closed") : undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const voteCounts = await getPollVoteCounts(
    serviceContext,
    { pollIds: polls.map((poll) => poll.id) }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const t = await getTranslations("admin.polls");
  const tStatus = await getTranslations("status");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{total} total polls</p>
        </div>
        <Link
          className="vh-v3-focus rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          href={`${adminBasePath}/polls/new`}
          data-testid="admin-polls-add"
        >
          + New Poll
        </Link>
      </header>

      <form className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm" method="get">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              defaultValue={query}
              placeholder="Search polls..."
              testId="admin-polls-search"
            />
          </div>
          <div className="relative">
            <select
              className="vh-v3-focus appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
              name="status"
              data-testid="admin-polls-status"
              defaultValue={status}
            >
              <option value="">All statuses</option>
              <option value="active">{tStatus("active")}</option>
              <option value="draft">{tStatus("draft")}</option>
              <option value="closed">{tStatus("closed")}</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {polls.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-stone-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-polls-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Poll
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                    Author
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 md:table-cell">
                    Votes
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {polls.map((poll) => {
                  const pollWithMeta = poll as typeof poll & {
                    creatorName?: string;
                    createdAt?: Date | string;
                  };

                  return (
                    <tr
                      key={poll.id}
                      className="transition-colors hover:bg-stone-50"
                      data-testid={`admin-polls-row-${poll.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`${adminBasePath}/polls/${poll.id}`}
                          className="group flex items-center gap-2.5"
                          data-testid={`poll-list-detail-${poll.id}`}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-100 bg-blue-50">
                            <ListChecksIcon className="h-3.5 w-3.5 text-blue-500" />
                          </div>
                          <p className="font-medium text-stone-900 transition-colors group-hover:text-teal-700">
                            {poll.title}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge variant={poll.status} label={tStatus(poll.status)} />
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-600 md:table-cell">
                        {pollWithMeta.creatorName ?? "-"}
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-600 md:table-cell">
                        {voteCounts.get(poll.id) ?? 0}
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-400 lg:table-cell">
                        {formatDate(pollWithMeta.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5 text-xs text-stone-400">
          <p>{polls.length} of {total} polls</p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`${adminBasePath}/polls${buildQuery({ q: query || undefined, status: status || undefined, page: String(page - 1) })}`}
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
                href={`${adminBasePath}/polls${buildQuery({ q: query || undefined, status: status || undefined, page: String(page + 1) })}`}
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
