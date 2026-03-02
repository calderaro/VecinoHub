import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { PollAdminActions } from "@/components/polls/poll-admin-actions";
import { PollOptionsManager } from "@/components/polls/poll-options-manager";
import { StatusBadge } from "@/components/ui-v3";
import { getPollParticipation, getPollResults, getPollWithOptions } from "@/services/polls";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date | string | null | undefined, locale: string) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function PollDetailPage({
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
  const results = await getPollResults(serviceContext, { pollId: resolvedParams.pollId });
  const participation = await getPollParticipation(serviceContext, {
    pollId: resolvedParams.pollId,
  });
  const participationPercent =
    participation.activeGroups > 0
      ? Math.round((participation.votedGroups / participation.activeGroups) * 100)
      : 0;

  const locale = await getLocale();
  const t = await getTranslations("admin.pollDetail");
  const tStatus = await getTranslations("status");

  const pollWithMeta = poll as typeof poll & { creatorName?: string };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href={`${adminBasePath}/polls`}
        data-testid="poll-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                {t("pollLabel")}
              </p>
              <h1 className="mb-2 text-xl font-bold text-stone-900">{poll.title}</h1>
              {poll.description ? <p className="mb-3 text-sm text-stone-500">{poll.description}</p> : null}
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge variant={poll.status} label={tStatus(poll.status)} />
                <span className="text-xs text-stone-400">
                  {t("createdBy")} {pollWithMeta.creatorName ?? "-"}
                </span>
                <span className="text-xs text-stone-400">
                  {t("startedLabel")} {formatDate(poll.createdAt, locale)}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {poll.status !== "closed" ? (
                <Link
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                  href={`${adminBasePath}/polls/${poll.id}/edit`}
                  data-testid="poll-detail-edit"
                >
                  <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
                </Link>
              ) : null}
              <PollAdminActions pollId={poll.id} status={poll.status} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 border-b border-stone-100 px-6 py-5 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.participants")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{participation.votedGroups}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.options")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{poll.options.length}</p>
          </div>
          <div className="rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs text-stone-400">{t("stats.participationRate")}</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{participationPercent}%</p>
          </div>
        </div>

        <div className="px-6 py-5">
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
        </div>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("results")}</h2>
          <div className="text-xs uppercase tracking-[0.3em] text-stone-500">
            {t("participation", {
              voted: participation.votedGroups,
              total: participation.activeGroups,
              percent: participationPercent,
            })}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.3em] text-stone-500">
              <tr>
                <th className="py-2">{t("table.option")}</th>
                <th className="py-2">{t("table.votes")}</th>
              </tr>
            </thead>
            <tbody className="text-stone-900">
              {results.map((result) => (
                <tr
                  key={result.id}
                  className="border-t border-stone-200"
                  data-testid={`admin-poll-results-row-${result.id}`}
                >
                  <td className="py-3 font-medium">{result.label}</td>
                  <td className="py-3 text-stone-500">
                    {participation.activeGroups > 0
                      ? `${result.count} (${Math.round((result.count / participation.activeGroups) * 100)}%)`
                      : `${result.count} (0%)`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
