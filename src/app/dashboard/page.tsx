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
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            VecinoHub
          </p>
          <h1 className="text-3xl font-semibold">No group assigned yet</h1>
          <p className="text-sm text-slate-400">
            Your account is pending group assignment. Please wait for a group
            admin to add you to a house.
          </p>
        </div>
      </div>
    );
  }

  redirect(`/dashboard/${groups[0].id}`);
}
