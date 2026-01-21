import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-900/80 bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              VecinoHub Admin
            </p>
            <p className="text-sm text-slate-300">Admin control panel</p>
          </div>
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
          </nav>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="hover:text-emerald-200" href="/">
              Neighbor UI
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
