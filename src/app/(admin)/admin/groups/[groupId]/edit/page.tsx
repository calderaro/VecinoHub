import { redirect } from "next/navigation";

import { GroupForm } from "@/components/groups/group-form";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function GroupEditPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const canManage =
    session.user.role === "admin" || group.adminUserId === session.user.id;

  if (!canManage) {
    redirect(`/admin/groups/${resolvedParams.groupId}`);
  }

  return (
    <GroupForm
      mode="edit"
      groupId={group.id}
      initialName={group.name}
      initialAddress={group.address}
      initialAdminUserId={group.adminUserId}
    />
  );
}
