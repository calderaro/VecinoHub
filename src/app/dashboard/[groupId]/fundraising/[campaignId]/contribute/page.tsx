import { redirect } from "next/navigation";

import { ContributionForm } from "@/components/fundraising/contribution-form";
import { listUserGroups } from "@/services/groups";
import { getCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

export default async function NeighborContributionPage({
  params,
}: {
  params:
    | { groupId: string; campaignId: string }
    | Promise<{ groupId: string; campaignId: string }>;
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

  if (campaign.status !== "open") {
    redirect(`/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}`);
  }

  const groups = await listUserGroups(serviceContext);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Submit contribution</h1>
        <p className="text-sm text-slate-400">{campaign.title}</p>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Per group: ${campaign.amount}</span>
          <span>Goal: ${campaign.goalAmount}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <ContributionForm
          campaignId={campaign.id}
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
          initialGroupId={resolvedParams.groupId}
        />
      </section>
    </div>
  );
}
