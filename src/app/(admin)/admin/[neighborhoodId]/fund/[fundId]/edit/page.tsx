import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundForm } from "@/components/funds/fund-form";
import { getNeighborhoodFundOverview } from "@/services/funds";
import { getSession } from "@/server/auth";

export default async function AdminEditFundPage({
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
  const [overview, t] = await Promise.all([
    getNeighborhoodFundOverview(serviceContext, { fundId }).catch(() => null),
    getTranslations("admin.funds.formPage"),
  ]);

  if (!overview) {
    redirect(`${adminBasePath}/fund`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("editTitle")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("editSubtitle")}</p>
      </header>
      <FundForm
        mode="edit"
        neighborhoodId={neighborhoodId}
        fundId={fundId}
        adminBasePath={adminBasePath}
        initialName={overview.name}
        initialDescription={overview.description}
        initialCurrencyCode={overview.currencyCode}
        initialStatus={overview.status}
      />
    </div>
  );
}
