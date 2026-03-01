import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ContributionForm } from "@/components/fundraising/contribution-form";
import { listUserGroups } from "@/services/groups";
import { getCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

export default async function AdminContributionPage({
  params,
}: {
  params: { campaignId: string } | Promise<{ campaignId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const campaign = await getCampaignDetail(serviceContext, {
    campaignId: resolvedParams.campaignId,
  });

  if (campaign.status !== "open") {
    redirect(`/admin/fundraising/${campaign.id}`);
  }

  const groups = await listUserGroups(serviceContext);
  const locale = await getLocale();
  const t = await getTranslations("admin.contributionPage");
  const formatCurrency = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-8">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-stone-500">
          {t("label")}
        </p>
        <h1 className="text-xl font-bold text-stone-900">{t("title")}</h1>
        <p className="text-sm text-stone-500">{campaign.title}</p>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-stone-500">
          <span>
            {t("perGroup", {
              amount: formatCurrency.format(Number(campaign.amount)),
            })}
          </span>
          <span>
            {t("goal", {
              amount: formatCurrency.format(Number(campaign.goalAmount)),
            })}
          </span>
        </div>
      </header>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <ContributionForm
          campaignId={campaign.id}
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        />
      </section>
    </div>
  );
}
