import { redirect } from "next/navigation";

import { PollForm } from "@/components/polls/poll-form";
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
    <PollForm
      mode="edit"
      pollId={poll.id}
      initialTitle={poll.title}
      initialDescription={poll.description}
      initialStatus={poll.status}
      initialOptions={poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description,
        amount: option.amount,
      }))}
    />
  );
}
