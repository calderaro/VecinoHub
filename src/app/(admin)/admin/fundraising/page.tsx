import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronDownIcon, TrendingUpIcon } from "lucide-react";

import { SearchInput, StatusBadge } from "@/components/ui-v3";
import { getCampaignProgressByIds, listCampaignsPaged } from "@/services/fundraising";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function FundraisingPage({
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

  const { items: campaigns, total } = await listCampaignsPaged(
    { user: session.user },
    {
      query: query || undefined,
      status: status ? (status as "open" | "closed") : undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const progressByCampaign = await getCampaignProgressByIds(
    { user: session.user },
    { campaignIds: campaigns.map((campaign) => campaign.id) }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const locale = await getLocale();
  const t = await getTranslations("admin.fundraisingList");
  const tStatus = await getTranslations("status");

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{total} total campaigns</p>
        </div>
        {session.user.role === "admin" ? (
          <Link
            className="vh-v3-focus rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            href="/admin/fundraising/new"
            data-testid="admin-fundraising-add"
          >
            + New Campaign
          </Link>
        ) : null}
      </header>

      <form className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm" method="get">
        <div className="flex flex-wrap gap-3">
          <div className="min-w-[220px] flex-1">
            <SearchInput
              defaultValue={query}
              placeholder="Search campaigns..."
              testId="admin-fundraising-search"
            />
          </div>
          <div className="relative">
            <select
              className="vh-v3-focus appearance-none rounded-lg border border-stone-200 bg-white py-2.5 pl-3 pr-8 text-sm text-stone-700 transition-colors hover:border-stone-300 focus:border-teal-400 focus:outline-none"
              name="status"
              data-testid="admin-fundraising-status"
              defaultValue={status}
            >
              <option value="">All statuses</option>
              <option value="open">{tStatus("open")}</option>
              <option value="closed">Ended</option>
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {campaigns.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-stone-400">{t("empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-fundraising-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Goal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Raised
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500 lg:table-cell">
                    Due
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {campaigns.map((campaign) => {
                  const progressMeta = progressByCampaign.get(campaign.id);
                  const raisedAmount = progressMeta?.raisedAmount ?? 0;
                  const goalAmount = Number(campaign.goalAmount);
                  const progress = goalAmount > 0 ? Math.min((raisedAmount / goalAmount) * 100, 100) : 0;
                  const statusVariant = campaign.status === "open" ? "open" : "ended";

                  return (
                    <tr
                      key={campaign.id}
                      className="transition-colors hover:bg-stone-50"
                      data-testid={`admin-fundraising-row-${campaign.id}`}
                    >
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/fundraising/${campaign.id}`}
                          className="group flex items-center gap-2.5"
                          data-testid={`campaign-list-detail-${campaign.id}`}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                            <TrendingUpIcon className="h-3.5 w-3.5 text-teal-500" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900 transition-colors group-hover:text-teal-700">
                              {campaign.title}
                            </p>
                            <p className="text-xs text-stone-400">{campaign.creatorName ?? "-"}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge
                          variant={statusVariant}
                          label={statusVariant === "open" ? tStatus("open") : tStatus("closed")}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-stone-700">
                        {formatCurrency(goalAmount, locale)}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-teal-600">{formatCurrency(raisedAmount, locale)}</p>
                        <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-stone-100">
                          <div className="h-full rounded-full bg-teal-500" style={{ width: `${progress}%` }} />
                        </div>
                      </td>
                      <td className="hidden px-4 py-3.5 text-stone-400 lg:table-cell">
                        {formatDate(campaign.dueDate, locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-stone-100 px-5 py-3.5 text-xs text-stone-400">
          <p>{campaigns.length} of {total} campaigns</p>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link
                className="vh-v3-focus rounded-md px-2.5 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-100"
                href={`/admin/fundraising${buildQuery({ q: query || undefined, status: status || undefined, page: String(page - 1) })}`}
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
                href={`/admin/fundraising${buildQuery({ q: query || undefined, status: status || undefined, page: String(page + 1) })}`}
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
