import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, formatDate, getFundStatusVariant } from "@/components/funds/utils";
import {
  getNeighborhoodFundOverview,
  listFundChargeTemplates,
} from "@/services/funds";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminFundDetailPage({
  params,
}: {
  params: { neighborhoodId: string; fundId: string } | Promise<{ neighborhoodId: string; fundId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, fundId } = await Promise.resolve(params);
  const adminBasePath = `/admin/${neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [overview, templates, neighborhood, locale, t, tStatus] = await Promise.all([
    getNeighborhoodFundOverview(serviceContext, { fundId }).catch(() => null),
    listFundChargeTemplates(serviceContext, { fundId }).catch(() => []),
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    getLocale(),
    getTranslations("admin.funds.detail"),
    getTranslations("status"),
  ]);

  if (!overview || !neighborhood) {
    redirect(`${adminBasePath}/fund`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-stone-900">{overview.name}</h1>
            <StatusBadge
              variant={getFundStatusVariant(overview.status) as never}
              label={tStatus(overview.status)}
            />
          </div>
          <p className="mt-0.5 text-sm text-stone-500">{overview.description || t("noDescription")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50" href={`${adminBasePath}/fund/${fundId}/periods`}>
            {t("actions.periods")}
          </Link>
          <Link className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50" href={`${adminBasePath}/fund/${fundId}/settings`}>
            {t("actions.settings")}
          </Link>
          <Link className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-teal-700" href={`${adminBasePath}/fund/${fundId}/edit`}>
            {t("actions.edit")}
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm" data-testid="admin-fund-detail-balance">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.balance")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {formatCurrency(overview.balance, locale, overview.currencyCode)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.openPeriods")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{overview.openPeriods}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.pendingPayments")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{overview.pendingPayments}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.overdueCharges")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{overview.overdueCharges}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-stone-900">{t("recentPeriods.title")}</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {overview.recentPeriods.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-500">{t("recentPeriods.empty")}</p>
            ) : (
              overview.recentPeriods.map((period) => (
                <Link
                  key={period.id}
                  href={`${adminBasePath}/fund/${fundId}/periods/${period.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-stone-50"
                  data-testid={`admin-fund-period-link-${period.id}`}
                >
                  <div>
                    <p className="font-medium text-stone-900">{period.title}</p>
                    <p className="text-xs text-stone-400">
                      {formatDate(period.dueDate, locale, neighborhood.timeZone)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-stone-700">
                    {formatCurrency(period.stats.totalCollected, locale, overview.currencyCode)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-stone-900">{t("recentMovements.title")}</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {overview.recentMovements.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-500">{t("recentMovements.empty")}</p>
            ) : (
              overview.recentMovements.map((movement) => (
                <div key={movement.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="font-medium text-stone-900">{movement.description}</p>
                    <p className="text-xs text-stone-400">
                      {formatDate(movement.effectiveAt, locale, neighborhood.timeZone)}
                    </p>
                  </div>
                  <p className={`text-sm font-semibold ${movement.entrySide === "credit" ? "text-teal-700" : "text-red-600"}`}>
                    {movement.entrySide === "credit" ? "+" : "-"}
                    {formatCurrency(Number(movement.amount), locale, overview.currencyCode)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("templates.title")}</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {templates.length === 0 ? (
            <p className="px-5 py-8 text-sm text-stone-500">{t("templates.empty")}</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-stone-900">{template.title}</p>
                  <p className="text-xs text-stone-400">{template.frequency}</p>
                </div>
                <StatusBadge
                  variant={getFundStatusVariant(template.status) as never}
                  label={tStatus(template.status)}
                />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
