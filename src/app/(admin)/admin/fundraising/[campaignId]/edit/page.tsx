import { redirect } from "next/navigation";

import { CampaignEditForm } from "@/components/fundraising/campaign-edit-form";
import { getCampaignDetail } from "@/services/fundraising";
import { getSession } from "@/server/auth";

export default async function CampaignEditPage({
  params,
}: {
  params: { campaignId: string } | Promise<{ campaignId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  if (session.user.role !== "admin") {
    redirect(`/admin/fundraising/${resolvedParams.campaignId}`);
  }

  const campaign = await getCampaignDetail({ user: session.user }, {
    campaignId: resolvedParams.campaignId,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Edit campaign</h1>
        <p className="text-sm text-slate-400">
          Update title, goal amount, and status.
        </p>
      </header>

      <CampaignEditForm
        campaignId={campaign.id}
        initialTitle={campaign.title}
        initialDescription={campaign.description}
        initialGoalAmount={campaign.goalAmount}
        initialStatus={campaign.status}
      />
    </div>
  );
}
