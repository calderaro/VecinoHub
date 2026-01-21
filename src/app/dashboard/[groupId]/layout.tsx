import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMenu } from "@/components/user-menu";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const groups = await listUserGroups({ user: session.user });

  if (groups.length === 0) {
    redirect("/dashboard");
  }

  const selectedGroup = groups.find((group) => group.id === resolvedParams.groupId);

  if (!selectedGroup) {
    redirect(`/dashboard/${groups[0].id}`);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link
            href={`/dashboard/${resolvedParams.groupId}`}
            className="group flex flex-col"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-200 transition group-hover:text-emerald-300">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400 transition group-hover:text-emerald-300/70">
              Dashboard
            </span>
          </Link>
          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groupName={selectedGroup.name}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
            selectedGroupId={resolvedParams.groupId}
          />
        </div>
      </header>
      {children}
    </div>
  );
}
