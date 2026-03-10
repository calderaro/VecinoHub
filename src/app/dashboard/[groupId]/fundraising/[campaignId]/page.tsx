import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ContributionDeleteButton } from "@/components/fundraising/contribution-delete-button";
import Link from "next/link";

import { getResidentCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function NeighborCampaignDetailPage({
  params,
}: {
  params: { groupId: string; campaignId: string } | Promise<{ groupId: string; campaignId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const campaign = await getResidentCampaignDetail(serviceContext, {
    campaignId: resolvedParams.campaignId,
    groupId: resolvedParams.groupId,
  });
  const contributions = campaign.contributions;
  const contributedTotal = contributions.reduce(
    (total, contribution) => total + Number(contribution.amount ?? 0),
    0
  );
  const locale = await getLocale();
  const t = await getTranslations("dashboard.fundraisingDetail");
  const tStatus = await getTranslations("status");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{campaign.title}</h1>
        {campaign.description ? (
          <p className="text-sm text-[color:var(--muted)]">{campaign.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          <span>{t("statusLabel")}: {tStatus(campaign.status)}</span>
          <span>{t("perGroup", { amount: formatCurrency(Number(campaign.amount), locale) })}</span>
          <span>{t("goal", { amount: formatCurrency(Number(campaign.goalAmount), locale) })}</span>
        </div>
      </header>

      <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("yourContributions")}</h2>
          {campaign.status === "open" ? (
            <Link
              className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
              href={`/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}/contribute`}
            >
              {t("submitContribution")}
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          {t("totalContributed", { amount: formatCurrency(contributedTotal, locale) })}
        </p>
        <div className="mt-4 space-y-3">
          {contributions.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
          ) : (
            contributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--stroke)] bg-stone-50 px-3 py-2 text-sm text-[color:var(--muted-strong)]"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {t(`methods.${contribution.method}`)}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {t("amountLabel", {
                      amount: formatCurrency(Number(contribution.amount), locale),
                    })}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {t("statusLabel")}: {tStatus(contribution.status)}
                  </p>
                </div>
                {campaign.status === "open" ? (
                  <ContributionDeleteButton
                    contributionId={contribution.id}
                    translationNamespace="dashboard.contributionDelete"
                  />
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
