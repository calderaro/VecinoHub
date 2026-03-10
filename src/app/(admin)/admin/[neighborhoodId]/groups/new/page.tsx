import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { getSession } from "@/server/auth";

export default async function NewGroupPage({
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
  return (
    <GroupForm
      mode="create"
      adminBasePath={adminBasePath}
    />
  );
}
