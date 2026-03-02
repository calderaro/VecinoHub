import { redirect } from "next/navigation";

import { PollForm } from "@/components/polls/poll-form";
import { getPollWithOptions } from "@/services/polls";
import { getSession } from "@/server/auth";

export default async function PollEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; pollId: string }
    | Promise<{ neighborhoodId: string; pollId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };

  const poll = await getPollWithOptions(serviceContext, {
    pollId: resolvedParams.pollId,
  });

  if (poll.status === "closed") {
    redirect(`${adminBasePath}/polls/${poll.id}`);
  }

  return (
    <PollForm
      mode="edit"
      adminBasePath={adminBasePath}
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
