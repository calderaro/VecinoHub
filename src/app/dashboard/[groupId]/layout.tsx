import Link from "next/link";
import { redirect } from "next/navigation";

import { AppNav } from "@/components/app-nav";
import { GroupSelector } from "@/components/group-selector";
import { SignOutButton } from "@/components/sign-out-button";
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
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              VecinoHub
            </p>
            <p className="text-sm text-slate-300">Neighborhood dashboard</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <GroupSelector
              groups={groups.map((group) => ({ id: group.id, name: group.name }))}
              selectedGroupId={resolvedParams.groupId}
              basePath="/dashboard"
            />
            <AppNav basePath={`/dashboard/${resolvedParams.groupId}`} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {session.user.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-full border border-slate-800 px-3 py-1 text-emerald-200 hover:border-emerald-300"
              >
                Admin
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
