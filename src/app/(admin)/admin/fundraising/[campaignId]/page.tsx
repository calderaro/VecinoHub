import Link from "next/link";
import { redirect } from "next/navigation";

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
            <p className="text-sm text-slate-400">{campaign.description}</p>
          ) : null}
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Status: {campaign.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
            Per group: ${campaign.amount}
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Goal: ${campaign.goalAmount}
          </span>
          {session.user.role === "admin" ? (
            <Link
              className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
              href={`/admin/fundraising/${campaign.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      {session.user.role === "admin" ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Contributions</h2>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Groups contributed: {participation.contributingGroups}/
              {participation.activeGroups} ({participationPercent}%)
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>Total contributed: ${contributedTotal.toFixed(2)}</span>
            <span>Completion: {completionPercent}%</span>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {campaign.status === "open" ? (
              <Link
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
                href={`/admin/fundraising/${campaign.id}/contribute`}
              >
                Submit contribution
              </Link>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Link
              className={`rounded-full border px-3 py-1 ${
                !statusFilter
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({})}`}
            >
              All ({contributionStats.total})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "submitted"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "submitted" })}`}
            >
              Submitted ({contributionStats.submitted})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "confirmed"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "confirmed" })}`}
            >
              Confirmed ({contributionStats.confirmed})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "rejected"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/fundraising/${campaign.id}${buildQuery({ status: "rejected" })}`}
            >
              Rejected ({contributionStats.rejected})
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {contributions.length === 0 ? (
              <p className="text-sm text-slate-500">
                {statusFilter
                  ? "No contributions match this status."
                  : "No contributions submitted."}
              </p>
            ) : (
              contributions.map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 px-3 py-2 text-sm text-slate-300"
                >
                <div>
                  <p className="font-medium text-slate-200">
                    {contribution.method.replace("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Amount: ${contribution.amount}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {contribution.status}
                  </p>
                  <p className="text-xs text-slate-500">
                    Group:{" "}
                    <Link
                      className="text-emerald-200 hover:text-emerald-100"
                      href={`/admin/groups/${contribution.groupId}`}
                    >
                      {contribution.groupName}
                    </Link>
                  </p>
                  <p className="text-xs text-slate-500">
                    Submitted by:{" "}
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
