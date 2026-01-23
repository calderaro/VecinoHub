import { redirect } from "next/navigation";

import { PollVoteForm } from "@/components/polls/poll-vote-form";
import { getPollWithOptions } from "@/services/polls";
import { getGroupVote } from "@/services/votes";
import { getSession } from "@/server/auth";

export default async function NeighborPollDetailPage({
  params,
}: {
  params: { groupId: string; pollId: string } | Promise<{ groupId: string; pollId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const poll = await getPollWithOptions(serviceContext, {
    pollId: resolvedParams.pollId,
  });
  const existingVote = await getGroupVote(serviceContext, {
    pollId: poll.id,
    groupId: resolvedParams.groupId,
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{poll.title}</h1>
        {poll.description ? (
          <p className="text-sm text-[color:var(--muted)]">{poll.description}</p>
        ) : null}
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Status: {poll.status}
        </p>
      </header>

      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <h2 className="text-lg font-semibold">Options</h2>
        <div className="mt-4 grid gap-3">
          {poll.options.map((option) => (
            <div
              key={option.id}
              className="rounded-2xl border border-white/10 bg-[rgba(18,26,26,0.5)] px-3 py-2 text-sm text-[color:var(--foreground)]"
            >
              <div className="font-medium">{option.label}</div>
              {option.description ? (
                <div className="text-xs text-[color:var(--muted)]">
                  {option.description}
                </div>
              ) : null}
              {option.amount ? (
                <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Amount: ${option.amount}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <PollVoteForm
          pollId={poll.id}
          groupId={resolvedParams.groupId}
          options={poll.options.map((option) => ({
            id: option.id,
            label: option.label,
            description: option.description,
            amount: option.amount,
          }))}
          disabled={poll.status !== "active"}
          existingVote={existingVote}
        />
      </section>
    </div>
  );
}
