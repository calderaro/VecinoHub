import { redirect } from "next/navigation";

import { ContributionDeleteButton } from "@/components/fundraising/contribution-delete-button";
import Link from "next/link";

import { listUserGroups } from "@/services/groups";
import { getCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

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
  const campaign = await getCampaignDetail(serviceContext, {
    campaignId: resolvedParams.campaignId,
  });
  const contributions = campaign.contributions.filter(
    (contribution) => contribution.submittedBy === session.user.id
  );
  const contributedTotal = contributions.reduce(
    (total, contribution) => total + Number(contribution.amount ?? 0),
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{campaign.title}</h1>
        {campaign.description ? (
          <p className="text-sm text-[color:var(--muted)]">{campaign.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          <span>Status: {campaign.status}</span>
          <span>Per group: ${campaign.amount}</span>
          <span>Goal: ${campaign.goalAmount}</span>
        </div>
      </header>

      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your contributions</h2>
          {campaign.status === "open" ? (
            <Link
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)]"
              href={`/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}/contribute`}
            >
              Submit contribution
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Total contributed: ${contributedTotal.toFixed(2)}
        </p>
        <div className="mt-4 space-y-3">
          {contributions.length === 0 ? (
            <p className="text-sm text-[color:var(--muted)]">No contributions submitted yet.</p>
          ) : (
            contributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(18,26,26,0.5)] px-3 py-2 text-sm text-[color:var(--muted-strong)]"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {contribution.method.replace("_", " ")}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    Amount: ${contribution.amount}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    Status: {contribution.status}
                  </p>
                </div>
                {campaign.status === "open" ? (
                  <ContributionDeleteButton contributionId={contribution.id} />
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
