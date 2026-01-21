import { redirect } from "next/navigation";

import { GroupEditForm } from "@/components/groups/group-edit-form";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Edit group</h1>
        <p className="text-sm text-slate-400">Update group details.</p>
      </header>

      <GroupEditForm
        groupId={group.id}
        initialName={group.name}
        initialAddress={group.address}
        initialAdminUserId={group.adminUserId}
      />
    </div>
  );
}
