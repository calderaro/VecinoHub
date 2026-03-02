import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { getGroupById } from "@/services/groups";
import { hasNeighborhoodAdminRole } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function GroupEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; groupId: string }
    | Promise<{ neighborhoodId: string; groupId: string }>;
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
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const hasAdminAccess = await hasNeighborhoodAdminRole(serviceContext);
  const canManage =
    hasAdminAccess || group.adminUserId === session.user.id;

  if (!canManage) {
    redirect(`${adminBasePath}/groups/${resolvedParams.groupId}`);
  }

  return (
    <GroupForm
      mode="edit"
      adminBasePath={adminBasePath}
      groupId={group.id}
      initialName={group.name}
      initialAddress={group.address}
      initialAdminUserId={group.adminUserId}
    />
  );
}
