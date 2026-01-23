import { redirect } from "next/navigation";

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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Administration</p>
        <h1 className="text-3xl font-semibold">Submit contribution</h1>
        <p className="text-sm text-[color:var(--muted)]">{campaign.title}</p>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          <span>Per group: ${campaign.amount}</span>
          <span>Goal: ${campaign.goalAmount}</span>
        </div>
      </header>

      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <ContributionForm
          campaignId={campaign.id}
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        />
      </section>
    </div>
  );
}
