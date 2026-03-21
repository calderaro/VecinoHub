import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, getFundStatusVariant } from "@/components/funds/utils";
import { listNeighborhoodFunds } from "@/services/funds";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminFundsPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId } = await Promise.resolve(params);
  const adminBasePath = `/admin/${neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [neighborhood, funds, locale, t, tStatus] = await Promise.all([
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    listNeighborhoodFunds(serviceContext, { neighborhoodId }),
    getLocale(),
    getTranslations("admin.funds.list"),
    getTranslations("status"),
  ]);

  if (!neighborhood) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{neighborhood.name}</p>
          <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
        </div>
        <Link
          href={`${adminBasePath}/fund/new`}
          className="rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          data-testid="admin-fund-add"
        >
          {t("newFund")}
        </Link>
      </header>

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        {funds.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-stone-500" data-testid="admin-fund-empty">
            {t("empty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="admin-fund-table">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.name")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.balance")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.periods")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("table.pending")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {funds.map((fund) => (
                  <tr key={fund.id} data-testid={`admin-fund-row-${fund.id}`} className="hover:bg-stone-50">
                    <td className="px-5 py-3.5">
                      <Link href={`${adminBasePath}/fund/${fund.id}`} className="font-medium text-stone-900 hover:text-teal-700">
                        {fund.name}
                      </Link>
                      {fund.description ? (
                        <p className="mt-0.5 text-xs text-stone-400">{fund.description}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge
                        variant={getFundStatusVariant(fund.status) as never}
                        label={tStatus(fund.status)}
                      />
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-stone-700">
                      {formatCurrency(fund.balance, locale, fund.currencyCode)}
                    </td>
                    <td className="px-4 py-3.5 text-stone-500">{fund.openPeriods}</td>
                    <td className="px-4 py-3.5 text-stone-500">{fund.pendingPayments}</td>
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
