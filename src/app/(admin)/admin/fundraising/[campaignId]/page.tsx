import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { ContributionStatusDialog } from "@/components/fundraising/contribution-status-dialog";
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{campaign.title}</h1>
          {campaign.description ? (
            <p className="text-sm text-[color:var(--muted)]">{campaign.description}</p>
          ) : null}
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("statusLabel")}: {tStatus(campaign.status)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)]">
            {t("perGroup", {
              amount: formatCurrency(Number(campaign.amount), locale),
            })}
          </span>
          <span className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)]">
            {t("goal", {
              amount: formatCurrency(Number(campaign.goalAmount), locale),
            })}
          </span>
          {session.user.role === "admin" ? (
            <Link
              className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
              href={`/admin/fundraising/${campaign.id}/edit`}
            >
              {t("edit")}
            </Link>
          ) : null}
        </div>
      </header>

      {session.user.role === "admin" ? (
        <section className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("contributions")}</h2>
            <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              {t("participation", {
                contributed: participation.contributingGroups,
                total: participation.activeGroups,
                percent: participationPercent,
              })}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            <span>
              {t("totalContributed", {
                amount: formatCurrency(contributedTotal, locale),
              })}
            </span>
            <span>{t("completion", { percent: completionPercent })}</span>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {campaign.status === "open" ? (
              <Link
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
                href={`/admin/fundraising/${campaign.id}/contribute`}
              >
                {t("submitContribution")}
              </Link>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            <Link
              className={`rounded-full border px-3 py-1 transition ${
                !statusFilter
                  ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                  : "border-[color:var(--stroke)] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({})}`}
            >
              {t("filters.all", { count: contributionStats.total })}
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 transition ${
                statusFilter === "submitted"
                  ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                  : "border-[color:var(--stroke)] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "submitted" })}`}
            >
              {t("filters.submitted", { count: contributionStats.submitted })}
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 transition ${
                statusFilter === "confirmed"
                  ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                  : "border-[color:var(--stroke)] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "confirmed" })}`}
            >
              {t("filters.confirmed", { count: contributionStats.confirmed })}
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 transition ${
                statusFilter === "rejected"
                  ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                  : "border-[color:var(--stroke)] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "rejected" })}`}
            >
              {t("filters.rejected", { count: contributionStats.rejected })}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {contributions.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                {statusFilter ? t("empty.filtered") : t("empty.all")}
              </p>
            ) : (
              contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--muted-strong)]"
                >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
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
                  <p className="text-xs text-[color:var(--muted)]">
                    {t("groupLabel")}{" "}
                    <Link
                      className="text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                      href={`/admin/groups/${contribution.groupId}`}
                    >
                      {contribution.groupName}
                    </Link>
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {t("submittedBy")}{" "}
                    {contribution.submittedByName || contribution.submittedByEmail}
                  </p>
                </div>
                  <ContributionStatusDialog
                    contribution={{ id: contribution.id, status: contribution.status }}
                    canEdit={campaign.status === "open"}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
