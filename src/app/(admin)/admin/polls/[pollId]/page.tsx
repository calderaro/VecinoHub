import Link from "next/link";
import { redirect } from "next/navigation";

import { PollAdminActions } from "@/components/polls/poll-admin-actions";
import { PollOptionsManager } from "@/components/polls/poll-options-manager";
import { getPollParticipation, getPollResults, getPollWithOptions } from "@/services/polls";
import { getSession } from "@/server/auth";

export default async function PollDetailPage({
  params,
}: {
  params: { pollId: string } | Promise<{ pollId: string }>;
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
  const results =
    session.user.role === "admin"
      ? await getPollResults(serviceContext, { pollId: resolvedParams.pollId })
      : [];
  const participation =
    session.user.role === "admin"
      ? await getPollParticipation(serviceContext, {
          pollId: resolvedParams.pollId,
        })
      : null;
  const participationPercent =
    participation && participation.activeGroups > 0
      ? Math.round(
          (participation.votedGroups / participation.activeGroups) * 100
        )
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{poll.title}</h1>
          {poll.description ? (
            <p className="text-sm text-slate-400">{poll.description}</p>
          ) : null}
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Status: {poll.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {session.user.role === "admin" && poll.status === "draft" ? (
            <Link
              className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
              href={`/admin/polls/${poll.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
          {session.user.role === "admin" ? (
            <PollAdminActions pollId={poll.id} status={poll.status} />
          ) : null}
        </div>
      </header>

      <PollOptionsManager
        pollId={poll.id}
        options={poll.options.map((option) => ({
          id: option.id,
          label: option.label,
          description: option.description,
          amount: option.amount,
        }))}
        canEdit={poll.status === "draft"}
      />

      {session.user.role === "admin" ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Results</h2>
            {participation ? (
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Participation: {participation.votedGroups}/
                {participation.activeGroups} ({participationPercent}%)
              </div>
            ) : null}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="py-2">Option</th>
                  <th className="py-2">Votes</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {results.map((result) => (
                  <tr key={result.id} className="border-t border-slate-800/80">
                    <td className="py-3 font-medium">{result.label}</td>
                    <td className="py-3 text-slate-400">
                      {participation && participation.activeGroups > 0
                        ? `${result.count} (${Math.round(
                            (result.count / participation.activeGroups) * 100
                          )}%)`
                        : `${result.count} (0%)`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
