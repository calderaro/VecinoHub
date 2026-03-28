import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, formatDate, getFundStatusVariant } from "@/components/funds/utils";
import { getFundPeriodDetail } from "@/services/funds";
import { getGroupById } from "@/services/groups";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function ResidentFundPeriodPage({
  params,
}: {
  params:
    | { groupId: string; fundId: string; periodId: string }
    | Promise<{ groupId: string; fundId: string; periodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId, fundId, periodId } = await Promise.resolve(params);
  const group = await getGroupById({ user: session.user }, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  const [detail, neighborhood, locale, t, tStatus] = await Promise.all([
    getFundPeriodDetail(serviceContext, { periodId }).catch(() => null),
    getNeighborhoodById(serviceContext, { neighborhoodId: group.neighborhoodId }).catch(() => null),
    getLocale(),
    getTranslations("dashboard.funds.periodDetail"),
    getTranslations("status"),
  ]);

  if (!detail || !neighborhood || detail.fund.id !== fundId) {
    redirect(`/dashboard/${groupId}/fund/${fundId}`);
  }

  const myCharge = detail.groupCharges.find((charge) => charge.groupId === groupId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">{t("label")}</p>
          <h1 className="text-3xl font-semibold">{detail.title}</h1>
          <p className="mt-2 text-sm text-[color:var(--muted)]">
            {formatDate(detail.dueDate, locale, neighborhood.timeZone)}
          </p>
        </div>
        {myCharge && myCharge.status !== "paid" && myCharge.status !== "waived" ? (
          <Link
            href={`/dashboard/${groupId}/fund/${fundId}/${periodId}/pay`}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-[color:var(--accent-strong)]"
            data-testid="dashboard-fund-period-pay"
          >
            {t("payNow")}
          </Link>
        ) : null}
      </header>

      {myCharge ? (
        <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-sm" data-testid="dashboard-fund-period-my-charge">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{t("myChargeTitle")}</h2>
              <p className="mt-1 text-sm text-stone-500">{group.name}</p>
            </div>
            <StatusBadge variant={getFundStatusVariant(myCharge.status) as never} label={tStatus(myCharge.status)} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("amountDue")}</p>
              <p className="mt-1 font-semibold text-stone-900">
                {formatCurrency(Number(myCharge.amountDue), locale, detail.fund.currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("amountPaid")}</p>
              <p className="mt-1 font-semibold text-stone-900">
                {formatCurrency(Number(myCharge.amountPaid), locale, detail.fund.currencyCode)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{t("remaining")}</p>
              <p className="mt-1 font-semibold text-stone-900">
                {formatCurrency(myCharge.remainingAmount, locale, detail.fund.currencyCode)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] shadow-sm">
        <div className="border-b border-[color:var(--stroke)] px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("boardTitle")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="dashboard-fund-period-board">
            <thead>
              <tr className="border-b border-[color:var(--stroke)] bg-stone-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.group")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.status")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.paid")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.remaining")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--stroke)]">
              {detail.groupCharges.map((charge) => (
                <tr key={charge.id}>
                  <td className="px-5 py-3.5 font-medium text-stone-900">{charge.groupName}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge variant={getFundStatusVariant(charge.status) as never} label={tStatus(charge.status)} />
                  </td>
                  <td className="px-4 py-3.5 text-stone-600">
                    {formatCurrency(Number(charge.amountPaid), locale, detail.fund.currencyCode)}
                  </td>
                  <td className="px-4 py-3.5 text-stone-600">
                    {formatCurrency(charge.remainingAmount, locale, detail.fund.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
