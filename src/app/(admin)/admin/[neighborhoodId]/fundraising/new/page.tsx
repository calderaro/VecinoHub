import { redirect } from "next/navigation";

import { CampaignForm } from "@/components/fundraising/campaign-form";
import { getSession } from "@/server/auth";

export default async function NewCampaignPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  return <CampaignForm mode="create" adminBasePath={adminBasePath} />;
}
