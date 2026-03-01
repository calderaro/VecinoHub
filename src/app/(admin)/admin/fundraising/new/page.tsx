import { redirect } from "next/navigation";

import { CampaignForm } from "@/components/fundraising/campaign-form";
import { getSession } from "@/server/auth";

export default async function NewCampaignPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/fundraising");
  }

  return <CampaignForm mode="create" />;
}
