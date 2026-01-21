import { redirect } from "next/navigation";

import { PollCreateForm } from "@/components/polls/poll-create-form";
import { getSession } from "@/server/auth";

export default async function NewPollPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/polls");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Create poll</h1>
        <p className="text-sm text-slate-400">Start a new neighborhood poll.</p>
      </header>

      <PollCreateForm />
    </div>
  );
}
