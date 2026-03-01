import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("dashboard.pollDetail");
  const tStatus = await getTranslations("status");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold">{poll.title}</h1>
        {poll.description ? (
          <p className="text-sm text-[color:var(--muted)]">{poll.description}</p>
        ) : null}
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          {t("statusLabel")}: {tStatus(poll.status)}
        </p>
      </header>

      <section className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t("optionsTitle")}</h2>
        <div className="mt-4 grid gap-3">
          {poll.options.map((option) => (
            <div
              key={option.id}
              className="rounded-2xl border border-[color:var(--stroke)] bg-stone-50 px-3 py-2 text-sm text-[color:var(--foreground)]"
            >
              <div className="font-medium">{option.label}</div>
              {option.description ? (
                <div className="text-xs text-[color:var(--muted)]">
                  {option.description}
                </div>
              ) : null}
              {option.amount ? (
                <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {t("amount", { amount: option.amount })}
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
