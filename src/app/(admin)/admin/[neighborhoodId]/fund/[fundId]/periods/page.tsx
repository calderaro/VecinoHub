import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, formatDate, getFundStatusVariant } from "@/components/funds/utils";
import { getNeighborhoodFundOverview, listFundChargePeriods } from "@/services/funds";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminFundPeriodsPage({
  params,
}: {
  params: { neighborhoodId: string; fundId: string } | Promise<{ neighborhoodId: string; fundId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, fundId } = await Promise.resolve(params);
  const adminBasePath = `/admin/${neighborhoodId}/fund/${fundId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [overview, periods, neighborhood, locale, t, tStatus] = await Promise.all([
    getNeighborhoodFundOverview(serviceContext, { fundId }).catch(() => null),
    listFundChargePeriods(serviceContext, { fundId, limit: 100, offset: 0 }),
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    getLocale(),
    getTranslations("admin.funds.periods"),
    getTranslations("status"),
  ]);

  if (!overview || !neighborhood) {
    redirect(`/admin/${neighborhoodId}/fund`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">{t("title", { name: overview.name })}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
        </div>
        <Link
          href={`${adminBasePath}/periods/new`}
          className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          data-testid="admin-fund-periods-add"
        >
          {t("newPeriod")}
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {periods.items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500">{t("empty")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-fund-periods-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.title")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.dueDate")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.expected")}</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.collected")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {periods.items.map((period) => (
                  <tr key={period.id} className="hover:bg-stone-50" data-testid={`admin-fund-period-row-${period.id}`}>
                    <td className="px-5 py-3.5">
                      <Link href={`${adminBasePath}/periods/${period.id}`} className="font-medium text-stone-900 hover:text-teal-700">
                        {period.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge variant={getFundStatusVariant(period.status) as never} label={tStatus(period.status)} />
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">
                      {formatDate(period.dueDate, locale, neighborhood.timeZone)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-700">
                      {formatCurrency(period.stats.totalExpected, locale, overview.currencyCode)}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-teal-700">
                      {formatCurrency(period.stats.totalCollected, locale, overview.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
