import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundMovementForm } from "@/components/funds/fund-movement-form";
import { getSession } from "@/server/auth";

export default async function AdminFundIncomePage({
  params,
}: {
  params: { neighborhoodId: string; fundId: string } | Promise<{ neighborhoodId: string; fundId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId, fundId } = await Promise.resolve(params);
  const t = await getTranslations("admin.funds.movementFormPage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("incomeTitle")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("incomeSubtitle")}</p>
      </header>
      <FundMovementForm
        fundId={fundId}
        kind="income"
        redirectTo={`/admin/${neighborhoodId}/fund/${fundId}`}
      />
    </div>
  );
}
