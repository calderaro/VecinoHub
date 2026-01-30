import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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

  const t = await getTranslations("nav");

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <header className="border-b border-[color:var(--stroke)] bg-[color:var(--surface)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link href={`/dashboard/${resolvedParams.groupId}`} className="group flex flex-col">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-strong)] transition group-hover:text-[color:var(--accent)]">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] transition group-hover:text-[color:var(--accent)] group-hover:opacity-80">
              {t("dashboard")}
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
