import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundPeriodForm } from "@/components/funds/fund-period-form";
import { listFundChargeTemplates } from "@/services/funds";
import { getSession } from "@/server/auth";

export default async function AdminNewFundPeriodPage({
  params,
}: {
  params: { neighborhoodId: string; fundId: string } | Promise<{ neighborhoodId: string; fundId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, fundId } = await Promise.resolve(params);
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };
  const [templates, t] = await Promise.all([
    listFundChargeTemplates(serviceContext, { fundId }).catch(() => []),
    getTranslations("admin.funds.periodFormPage"),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </header>
      <FundPeriodForm
        fundId={fundId}
        redirectTo={`/admin/${neighborhoodId}/fund/${fundId}/periods`}
        templates={templates.map((template) => ({ id: template.id, title: template.title }))}
      />
    </div>
  );
}
