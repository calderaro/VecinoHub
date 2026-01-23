import { redirect } from "next/navigation";

import { GroupCreateForm } from "@/components/groups/group-create-form";
import { getSession } from "@/server/auth";

export default async function NewGroupPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/groups");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Administration</p>
        <h1 className="text-3xl font-semibold">Create group</h1>
        <p className="text-sm text-[color:var(--muted)]">Add a new house group.</p>
      </header>

      <GroupCreateForm adminUserId={session.user.id} />
    </div>
  );
}
