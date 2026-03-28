import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { FundPaymentActions } from "@/components/funds/fund-payment-actions";
import { StatusBadge } from "@/components/ui-v3";
import { formatCurrency, formatDate, getFundStatusVariant } from "@/components/funds/utils";
import { getFundPeriodDetail } from "@/services/funds";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function AdminFundPeriodDetailPage({
  params,
}: {
  params:
    | { neighborhoodId: string; fundId: string; periodId: string }
    | Promise<{ neighborhoodId: string; fundId: string; periodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, fundId, periodId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };
  const [detail, neighborhood, locale, t, tStatus] = await Promise.all([
    getFundPeriodDetail(serviceContext, { periodId }).catch(() => null),
    getNeighborhoodById(serviceContext, { neighborhoodId }).catch(() => null),
    getLocale(),
    getTranslations("admin.funds.periodDetail"),
    getTranslations("status"),
  ]);

  if (!detail || !neighborhood || detail.fund.id !== fundId) {
    redirect(`/admin/${neighborhoodId}/fund/${fundId}/periods`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{detail.title}</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {formatDate(detail.dueDate, locale, neighborhood.timeZone)}
        </p>
      </header>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("chargesTitle")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="admin-fund-period-detail-table">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/60">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.group")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.status")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.due")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.paid")}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">{t("table.remaining")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {detail.groupCharges.map((charge) => (
                <tr key={charge.id} data-testid={`admin-fund-group-charge-${charge.id}`}>
                  <td className="px-5 py-3.5 font-medium text-stone-900">{charge.groupName}</td>
                  <td className="px-4 py-3.5">
                    <StatusBadge
                      variant={getFundStatusVariant(charge.status) as never}
                      label={tStatus(charge.status)}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-stone-700">
                    {formatCurrency(Number(charge.amountDue), locale, detail.fund.currencyCode)}
                  </td>
                  <td className="px-4 py-3.5 text-teal-700">
                    {formatCurrency(Number(charge.amountPaid), locale, detail.fund.currencyCode)}
                  </td>
                  <td className="px-4 py-3.5 text-stone-500">
                    {formatCurrency(charge.remainingAmount, locale, detail.fund.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-stone-900">{t("paymentsTitle")}</h2>
        </div>
        <div className="divide-y divide-stone-100">
          {detail.payments.length === 0 ? (
            <p className="px-5 py-8 text-sm text-stone-500">{t("paymentsEmpty")}</p>
          ) : (
            detail.payments.map((payment) => (
              <div key={payment.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-stone-900">{payment.groupName}</p>
                    <StatusBadge
                      variant={getFundStatusVariant(payment.status) as never}
                      label={tStatus(payment.status)}
                    />
                  </div>
                  <p className="mt-1 text-sm text-stone-600">
                    {formatCurrency(Number(payment.amount), locale, detail.fund.currencyCode)} ·{" "}
                    {formatDate(payment.paidAt, locale, neighborhood.timeZone)}
                  </p>
                  {"submittedByName" in payment ? (
                    <p className="mt-1 text-xs text-stone-400">
                      {payment.submittedByName || payment.submittedByEmail}
                    </p>
                  ) : null}
                </div>
                {detail.canModerate && payment.status === "submitted" ? (
                  <FundPaymentActions paymentId={payment.id} />
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
