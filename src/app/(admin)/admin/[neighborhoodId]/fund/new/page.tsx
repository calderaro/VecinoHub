import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundForm } from "@/components/funds/fund-form";
import { getSession } from "@/server/auth";

export default async function AdminNewFundPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { neighborhoodId } = await Promise.resolve(params);
  const t = await getTranslations("admin.funds.formPage");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("createTitle")}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("createSubtitle")}</p>
      </header>
      <FundForm
        mode="create"
        neighborhoodId={neighborhoodId}
        adminBasePath={`/admin/${neighborhoodId}`}
      />
    </div>
  );
}
