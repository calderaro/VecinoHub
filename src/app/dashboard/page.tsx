import { redirect } from "next/navigation";

import { listUserGroups } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardIndexPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const groups = await listUserGroups({ user: session.user });

  if (groups.length === 0) {
    return (
      <div className="min-h-screen text-[var(--foreground)]">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-20">
          <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
              VecinoHub
            </p>
            <h1 className="mt-4 text-3xl font-semibold">No group assigned yet</h1>
            <p className="mt-3 text-sm text-[color:var(--muted)]">
              Your account is pending group assignment. Please wait for a group
              admin to add you to a house.
            </p>
          </div>
        </div>
      </div>
    );
  }

  redirect(`/dashboard/${groups[0].id}`);
}
