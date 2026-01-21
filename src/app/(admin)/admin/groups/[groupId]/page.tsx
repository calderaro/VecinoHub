import Link from "next/link";
import { redirect } from "next/navigation";

import { GroupMembers } from "@/components/groups/group-members";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function GroupDetailPage({
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
  const members = await listGroupMembers(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const canManage =
    session.user.role === "admin" || group.adminUserId === session.user.id;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{group.name}</h1>
          {group.address ? (
            <p className="text-sm text-slate-400">{group.address}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-400">
            {canManage ? "Group admin" : "Member"}
          </span>
          {canManage ? (
            <Link
              className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
              href={`/admin/groups/${group.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <GroupMembers
          groupId={group.id}
          members={members}
          canManage={canManage}
        />
      </section>
    </div>
  );
}
