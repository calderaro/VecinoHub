import { redirect } from "next/navigation";

import { PollEditForm } from "@/components/polls/poll-edit-form";
import { getPollWithOptions } from "@/services/polls";
import { getSession } from "@/server/auth";

export default async function PollEditPage({
  params,
}: {
  params: { pollId: string } | Promise<{ pollId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  if (session.user.role !== "admin") {
    redirect(`/admin/polls/${resolvedParams.pollId}`);
  }

  const poll = await getPollWithOptions({ user: session.user }, {
    pollId: resolvedParams.pollId,
  });

  if (poll.status === "closed") {
    redirect(`/admin/polls/${poll.id}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Administration</p>
        <h1 className="text-3xl font-semibold">Edit poll</h1>
        <p className="text-sm text-[color:var(--muted)]">Update poll details.</p>
      </header>

      <PollEditForm
        pollId={poll.id}
        initialTitle={poll.title}
        initialDescription={poll.description}
        initialStatus={poll.status}
      />
    </div>
  );
}
