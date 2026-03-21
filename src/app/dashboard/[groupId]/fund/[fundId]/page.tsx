import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, formatDate, getFundStatusVariant } from "@/components/funds/utils";
import { getResidentFundDashboard } from "@/services/funds";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentFundDetailPage({
  params,
}: {
  params: { groupId: string; fundId: string } | Promise<{ groupId: string; fundId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId, fundId } = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  const [dashboard, locale, t, tStatus] = await Promise.all([
    getResidentFundDashboard(serviceContext, { groupId, fundId }).catch(() => null),
    getLocale(),
    getTranslations("dashboard.funds.detail"),
    getTranslations("status"),
  ]);

  if (!dashboard) {
    redirect(`/dashboard/${groupId}/fund`);
  }

  const activeCharge = dashboard.groupSummary.charges.find((charge) => charge.status !== "paid" && charge.status !== "waived");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">{t("label")}</p>
          <h1 className="text-3xl font-semibold">{dashboard.overview.name}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{dashboard.overview.description || t("noDescription")}</p>
        </div>
        {activeCharge ? (
          <Link
            href={`/dashboard/${groupId}/fund/${fundId}/${activeCharge.periodId}/pay`}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[color:var(--accent-strong)]"
            data-testid="dashboard-fund-pay-current"
          >
            {t("payNow")}
          </Link>
        ) : null}
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.balance")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {formatCurrency(dashboard.overview.balance, locale, dashboard.overview.currencyCode)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.outstanding")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">
            {formatCurrency(dashboard.groupSummary.outstandingAmount, locale, dashboard.overview.currencyCode)}
          </p>
        </div>
        <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("stats.openPeriods")}</p>
          <p className="mt-2 text-2xl font-bold text-stone-900">{dashboard.overview.openPeriods}</p>
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] shadow-sm">
        <div className="border-b border-[color:var(--stroke)] px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("myChargesTitle")}</h2>
        </div>
        <div className="divide-y divide-[color:var(--stroke)]">
          {dashboard.groupSummary.charges.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[color:var(--muted)]">{t("myChargesEmpty")}</p>
          ) : (
            dashboard.groupSummary.charges.map((charge) => (
              <Link
                key={charge.id}
                href={`/dashboard/${groupId}/fund/${fundId}/${charge.periodId}`}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-stone-50"
                data-testid={`dashboard-fund-charge-${charge.id}`}
              >
                <div>
                  <p className="font-medium text-stone-900">{charge.title}</p>
                  <p className="text-xs text-stone-400">{formatDate(charge.dueDate, locale)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-stone-600">
                    {formatCurrency(charge.remainingAmount, locale, dashboard.overview.currencyCode)}
                  </p>
                  <StatusBadge variant={getFundStatusVariant(charge.status) as never} label={tStatus(charge.status)} />
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] shadow-sm">
        <div className="border-b border-[color:var(--stroke)] px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("movementsTitle")}</h2>
        </div>
        <div className="divide-y divide-[color:var(--stroke)]">
          {dashboard.overview.recentMovements.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[color:var(--muted)]">{t("movementsEmpty")}</p>
          ) : (
            dashboard.overview.recentMovements.map((movement) => (
              <div key={movement.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-stone-900">{movement.description}</p>
                  <p className="text-xs text-stone-400">{formatDate(movement.effectiveAt, locale)}</p>
                </div>
                <p className={`text-sm font-semibold ${movement.entrySide === "credit" ? "text-teal-700" : "text-red-600"}`}>
                  {movement.entrySide === "credit" ? "+" : "-"}
                  {formatCurrency(Number(movement.amount), locale, dashboard.overview.currencyCode)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
