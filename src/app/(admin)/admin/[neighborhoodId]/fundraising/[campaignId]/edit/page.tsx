import { redirect } from "next/navigation";

import { CampaignForm } from "@/components/fundraising/campaign-form";
import { getCampaignDetail } from "@/services/fundraising";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function CampaignEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; campaignId: string }
    | Promise<{ neighborhoodId: string; campaignId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };

  const [campaign, neighborhood] = await Promise.all([
    getCampaignDetail(serviceContext, {
      campaignId: resolvedParams.campaignId,
    }),
    getNeighborhoodById(serviceContext, { neighborhoodId: resolvedParams.neighborhoodId }).catch(
      () => null
    ),
  ]);
  if (!neighborhood) {
    redirect(adminBasePath);
  }
  const campaignWithContributions = campaign as typeof campaign & {
    contributions?: Array<{ amount: string; status: "submitted" | "confirmed" | "rejected" }>;
  };
  const confirmedRaisedAmount = (campaignWithContributions.contributions ?? []).reduce((sum, contribution) => {
    if (contribution.status !== "confirmed") {
      return sum;
    }
    return sum + Number(contribution.amount ?? 0);
  }, 0);

  return (
    <CampaignForm
      mode="edit"
      adminBasePath={adminBasePath}
      campaignId={campaign.id}
      neighborhoodId={resolvedParams.neighborhoodId}
      timeZone={neighborhood.timeZone}
      initialTitle={campaign.title}
      initialDescription={campaign.description}
      initialGoalAmount={campaign.goalAmount}
      initialDueDate={campaign.dueDate}
      initialStatus={campaign.status}
      initialRaisedAmount={confirmedRaisedAmount}
    />
  );
}
