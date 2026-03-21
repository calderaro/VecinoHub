import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FundMovementForm } from "@/components/funds/fund-movement-form";
import { FundTemplateForm } from "@/components/funds/fund-template-form";
import { StatusBadge } from "@/components/ui-v3";
import { getFundStatusVariant } from "@/components/funds/utils";
import { getNeighborhoodFundOverview, listFundChargeTemplates } from "@/services/funds";
import { getSession } from "@/server/auth";

export default async function AdminFundSettingsPage({
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
  const [overview, templates, t, tStatus] = await Promise.all([
    getNeighborhoodFundOverview(serviceContext, { fundId }).catch(() => null),
    listFundChargeTemplates(serviceContext, { fundId }).catch(() => []),
    getTranslations("admin.funds.settings"),
    getTranslations("status"),
  ]);

  if (!overview) {
    redirect(`/admin/${neighborhoodId}/fund`);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6">
      <header>
        <h1 className="text-xl font-bold text-stone-900">{t("title", { name: overview.name })}</h1>
        <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
      </header>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">{t("templatesTitle")}</h2>
          <StatusBadge variant={getFundStatusVariant(overview.status) as never} label={tStatus(overview.status)} />
        </div>
        <div className="mb-6 space-y-3">
          {templates.length === 0 ? (
            <p className="text-sm text-stone-500">{t("templatesEmpty")}</p>
          ) : (
            templates.map((template) => (
              <div key={template.id} className="rounded-lg border border-stone-100 px-4 py-3" data-testid={`admin-fund-template-${template.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">{template.title}</p>
                    <p className="text-xs text-stone-400">{template.frequency}</p>
                  </div>
                  <StatusBadge
                    variant={getFundStatusVariant(template.status) as never}
                    label={tStatus(template.status)}
                  />
                </div>
              </div>
            ))
          )}
        </div>
        <FundTemplateForm fundId={fundId} />
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">{t("adjustmentTitle")}</h2>
        <FundMovementForm
          fundId={fundId}
          kind="adjustment"
          redirectTo={`/admin/${neighborhoodId}/fund/${fundId}`}
        />
      </section>
    </div>
  );
}
