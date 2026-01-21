import Link from "next/link";
import { redirect } from "next/navigation";

import { UserMenu } from "@/components/user-menu";
import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const groups = await listUserGroups({ user: session.user });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <Link
            href="/admin"
            className="group flex flex-col"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-200 transition group-hover:text-emerald-300">
              VecinoHub
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400 transition group-hover:text-emerald-300/70">
              Admin
            </span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Link className="hover:text-emerald-200" href="/admin">
              Overview
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/users">
              Users
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/groups">
              Groups
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/polls">
              Polls
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/payments">
              Payments
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/events">
              Events
            </Link>
            <Link className="hover:text-emerald-200" href="/admin/posts">
              Posts
            </Link>
          </nav>
          <UserMenu
            user={{
              username: session.user.username,
              image: session.user.image,
              role: session.user.role,
            }}
            groups={groups.map((group) => ({ id: group.id, name: group.name }))}
          />
        </div>
      </header>
      {children}
    </div>
  );
}
