import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { CampaignDetailActions } from "@/components/fundraising/campaign-detail-actions";
import { ContributionStatusDialog } from "@/components/fundraising/contribution-status-dialog";
import { StatusBadge } from "@/components/ui-v3";
import { getCampaignParticipation, getCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

type AdminContribution = {
  id: string;
  campaignId: string;
  groupId: string;
  groupName: string;
  submittedBy: string;
  submittedByName: string;
  submittedByEmail: string;
  method: "cash" | "wire_transfer";
  amount: string;
  wireReference: string | null;
  wireDate: string | null;
  wireAmount: string | null;
  status: "submitted" | "confirmed" | "rejected";
  confirmedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

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

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: { campaignId: string } | Promise<{ campaignId: string }>;
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const locale = await getLocale();
  const t = await getTranslations("admin.campaignDetail");
  const tStatus = await getTranslations("status");
  const rawStatus = resolvedSearchParams?.status;
  const statusFilter =
    typeof rawStatus === "string" &&
    ["submitted", "confirmed", "rejected"].includes(rawStatus)
      ? (rawStatus as "submitted" | "confirmed" | "rejected")
      : undefined;
  const serviceContext = { user: session.user };
  const campaign = await getCampaignDetail(serviceContext, {
    campaignId: resolvedParams.campaignId,
  });
  const allContributions = campaign.contributions as AdminContribution[];
  const contributionStats = allContributions.reduce(
    (acc, contribution) => {
      acc.total += 1;
      acc[contribution.status] += 1;
      return acc;
    },
    { total: 0, submitted: 0, confirmed: 0, rejected: 0 }
  );
  const contributedTotal = allContributions.reduce(
    (sum, contribution) => sum + Number(contribution.amount ?? 0),
    0
  );
  const completionPercent =
    Number(campaign.goalAmount) > 0
      ? Math.round((contributedTotal / Number(campaign.goalAmount)) * 100)
      : 0;
  const contributions = statusFilter
    ? allContributions.filter((c) => c.status === statusFilter)
    : allContributions;
  const participation = await getCampaignParticipation(serviceContext, {
    campaignId: campaign.id,
  });
  const participationPercent =
    participation.activeGroups > 0
      ? Math.round(
          (participation.contributingGroups / participation.activeGroups) * 100
        )
      : 0;
  const campaignWithMeta = campaign as typeof campaign & { creatorName?: string };
  const statusVariant = campaign.status === "open" ? "open" : "ended";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href="/admin/fundraising"
        data-testid="campaign-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                {t("campaignLabel")}
              </p>
              <h1 className="mb-2 text-xl font-bold text-stone-900">{campaign.title}</h1>
              {campaign.description ? (
                <p className="mb-3 text-sm text-stone-500">{campaign.description}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge variant={statusVariant} label={tStatus(campaign.status)} />
                <span className="text-xs text-stone-400">
                  {t("createdBy")} {campaignWithMeta.creatorName ?? "-"}
                </span>
                <span className="text-xs text-stone-400">
                  {t("dueLabel")} {formatDate(campaign.dueDate, locale)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                href={`/admin/fundraising/${campaign.id}/edit`}
                data-testid="campaign-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <CampaignDetailActions campaignId={campaign.id} status={campaign.status} />
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
              <p className="text-xs text-stone-400">{t("stats.goal")}</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {formatCurrency(Number(campaign.goalAmount), locale)}
              </p>
            </div>
            <div className="rounded-lg border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-xs text-teal-600">{t("stats.raised")}</p>
              <p className="mt-1 text-sm font-semibold text-teal-700">
                {formatCurrency(contributedTotal, locale)}
              </p>
            </div>
            <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
              <p className="text-xs text-stone-400">{t("stats.contributions")}</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">{contributionStats.total}</p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs text-amber-600">{t("stats.pending")}</p>
              <p className="mt-1 text-sm font-semibold text-amber-700">{contributionStats.submitted}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-stone-500">
                {t("completion", { percent: completionPercent })}
              </span>
              <span className="text-stone-400">
                {formatCurrency(contributedTotal, locale)} /{" "}
                {formatCurrency(Number(campaign.goalAmount), locale)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-teal-500 transition-all"
                style={{ width: `${Math.min(completionPercent, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("contributions")}</h2>
          <div className="text-xs uppercase tracking-[0.3em] text-stone-500">
            {t("participation", {
              contributed: participation.contributingGroups,
              total: participation.activeGroups,
              percent: participationPercent,
            })}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-stone-500">
          <span>
            {t("totalContributed", {
              amount: formatCurrency(contributedTotal, locale),
            })}
          </span>
          <span>
            {t("perGroup", {
              amount: formatCurrency(Number(campaign.amount), locale),
            })}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          {campaign.status === "open" ? (
            <Link
              className="rounded-lg border border-stone-200 px-3.5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              href={`/admin/fundraising/${campaign.id}/contribute`}
              data-testid="campaign-detail-submit-contribution"
            >
              {t("submitContribution")}
            </Link>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-stone-500">
          <Link
            className={`rounded-full border px-3 py-1 transition ${
              !statusFilter
                ? "border-teal-300 bg-white text-teal-600"
                : "border-stone-200 text-stone-700 hover:border-teal-300"
            }`}
            href={`/admin/fundraising/${campaign.id}${buildQuery({})}`}
          >
            {t("filters.all", { count: contributionStats.total })}
          </Link>
          <Link
            className={`rounded-full border px-3 py-1 transition ${
              statusFilter === "submitted"
                ? "border-teal-300 bg-white text-teal-600"
                : "border-stone-200 text-stone-700 hover:border-teal-300"
            }`}
            href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "submitted" })}`}
          >
            {t("filters.submitted", { count: contributionStats.submitted })}
          </Link>
          <Link
            className={`rounded-full border px-3 py-1 transition ${
              statusFilter === "confirmed"
                ? "border-teal-300 bg-white text-teal-600"
                : "border-stone-200 text-stone-700 hover:border-teal-300"
            }`}
            href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "confirmed" })}`}
          >
            {t("filters.confirmed", { count: contributionStats.confirmed })}
          </Link>
          <Link
            className={`rounded-full border px-3 py-1 transition ${
              statusFilter === "rejected"
                ? "border-teal-300 bg-white text-teal-600"
                : "border-stone-200 text-stone-700 hover:border-teal-300"
            }`}
            href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "rejected" })}`}
          >
            {t("filters.rejected", { count: contributionStats.rejected })}
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {contributions.length === 0 ? (
            <p className="text-sm text-stone-500">
              {statusFilter ? t("empty.filtered") : t("empty.all")}
            </p>
          ) : (
            contributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700"
              >
                <div>
                  <p className="font-medium text-stone-900">
                    {t(`methods.${contribution.method}`)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {t("amountLabel", {
                      amount: formatCurrency(Number(contribution.amount), locale),
                    })}
                  </p>
                  <p className="text-xs text-stone-500">
                    {t("statusLabel")}: {tStatus(contribution.status)}
                  </p>
                  <p className="text-xs text-stone-500">
                    {t("groupLabel")}{" "}
                    <Link
                      className="text-teal-600 hover:text-teal-700"
                      href={`/admin/groups/${contribution.groupId}`}
                    >
                      {contribution.groupName}
                    </Link>
                  </p>
                  <p className="text-xs text-stone-500">
                    {t("submittedBy")}{" "}
                    {contribution.submittedByName || contribution.submittedByEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge variant={contribution.status} label={tStatus(contribution.status)} />
                  <ContributionStatusDialog
                    contribution={{ id: contribution.id, status: contribution.status }}
                    canEdit={campaign.status === "open"}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
