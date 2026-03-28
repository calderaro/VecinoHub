import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundPaymentForm } from "@/components/funds/fund-payment-form";
import { getFundPeriodDetail } from "@/services/funds";
import { getGroupById } from "@/services/groups";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function ResidentFundPaymentPage({
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
  const [detail, neighborhood, t] = await Promise.all([
    getFundPeriodDetail(serviceContext, { periodId }).catch(() => null),
    getNeighborhoodById(serviceContext, { neighborhoodId: group.neighborhoodId }).catch(() => null),
    getTranslations("dashboard.funds.paymentPage"),
  ]);

  if (!detail || !neighborhood || detail.fund.id !== fundId) {
    redirect(`/dashboard/${groupId}/fund/${fundId}`);
  }

  const myCharge = detail.groupCharges.find((charge) => charge.groupId === groupId);
  if (!myCharge || myCharge.status === "paid" || myCharge.status === "waived") {
    redirect(`/dashboard/${groupId}/fund/${fundId}/${periodId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle", { period: detail.title })}</p>
      </header>
      <FundPaymentForm
        fundId={fundId}
        groupId={groupId}
        groupChargeId={myCharge.id}
        initialAmount={String(myCharge.remainingAmount)}
        redirectTo={`/dashboard/${groupId}/fund/${fundId}/${periodId}`}
        timeZone={neighborhood.timeZone}
      />
    </div>
  );
}
