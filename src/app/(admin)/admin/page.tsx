import { redirect } from "next/navigation";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { getSession } from "@/server/auth";
import {
  listActivePollsWithParticipation,
  listDraftPolls,
  getPollsStats,
} from "@/services/polls";
import {
  listOpenCampaignsWithProgress,
  listPendingContributions,
  getFundraisingStats,
} from "@/services/fundraising";
import { listUpcomingEvents, getEventsStats } from "@/services/events";
import { listRecentPosts, listDraftPosts, getPostsStats } from "@/services/posts";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string, locale: string) {
  return new Date(date).toLocaleDateString(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: Date | string, locale: string) {
  return new Date(date).toLocaleDateString(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const locale = await getLocale();
  const t = await getTranslations("admin.overview");
  const serviceContext = { user: session.user };

  const [
    pollsStats,
    activePolls,
    draftPolls,
    fundraisingStats,
    openCampaigns,
    pendingContributions,
    eventsStats,
    upcomingEvents,
    postsStats,
    recentPosts,
    draftPosts,
  ] = await Promise.all([
    getPollsStats(serviceContext),
    listActivePollsWithParticipation(serviceContext),
    listDraftPolls(serviceContext),
    getFundraisingStats(serviceContext),
    listOpenCampaignsWithProgress(serviceContext),
    listPendingContributions(serviceContext),
    getEventsStats(serviceContext),
    listUpcomingEvents(serviceContext),
    getPostsStats(serviceContext),
    listRecentPosts(serviceContext),
    listDraftPosts(serviceContext),
  ]);

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12"
      data-testid="admin-overview-root"
    >
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold" data-testid="admin-overview-title">
          {t("title")}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("subtitle")}
        </p>
      </header>

      {/* Stats Cards */}
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="admin-overview-stats"
      >
        <Link
          href="/admin/polls"
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:border-[color:var(--accent)]"
          data-testid="admin-overview-stats-polls"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("stats.activePolls")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--accent)]">
            {pollsStats.active}
          </p>
          {pollsStats.drafts > 0 && (
            <p className="mt-1 text-xs text-[color:var(--accent-strong)]">
              {t("stats.pollDrafts", { count: pollsStats.drafts })}
            </p>
          )}
        </Link>

        <Link
          href="/admin/fundraising"
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:border-[color:var(--accent)]"
          data-testid="admin-overview-stats-fundraising"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("stats.openCampaigns")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--accent)]">
            {fundraisingStats.openCampaigns}
          </p>
          {fundraisingStats.pendingContributions > 0 && (
            <p className="mt-1 text-xs text-[color:var(--accent-strong)]">
              {t("stats.pendingContributions", {
                count: fundraisingStats.pendingContributions,
              })}
            </p>
          )}
        </Link>

        <Link
          href="/admin/events"
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:border-[color:var(--accent)]"
          data-testid="admin-overview-stats-events"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("stats.upcomingEvents")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--accent)]">
            {eventsStats.upcoming}
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {t("stats.totalEvents", { count: eventsStats.total })}
          </p>
        </Link>

        <Link
          href="/admin/posts"
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition hover:border-[color:var(--accent)]"
          data-testid="admin-overview-stats-posts"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("stats.publishedPosts")}
          </p>
          <p className="mt-2 text-3xl font-semibold text-[color:var(--accent)]">
            {postsStats.published}
          </p>
          {postsStats.drafts > 0 && (
            <p className="mt-1 text-xs text-[color:var(--accent-strong)]">
              {t("stats.postDrafts", { count: postsStats.drafts })}
            </p>
          )}
        </Link>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Polls Section */}
        <section
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          data-testid="admin-overview-polls"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("polls.title")}</h2>
            <Link
              href="/admin/polls/new"
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            >
              {t("polls.new")}
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {activePolls.length === 0 ? (
              <li className="text-[color:var(--muted)]">{t("polls.empty")}</li>
            ) : (
              activePolls.slice(0, 5).map((poll) => (
                <li
                  key={poll.id}
                  className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3"
                >
                  <Link href={`/admin/polls/${poll.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)]">{poll.title}</p>
                      <span className="shrink-0 rounded-full border border-[color:var(--accent)] bg-[color:var(--surface)] px-2 py-0.5 text-xs text-[color:var(--accent)]">
                        {t("polls.participation", { percentage: poll.participation })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--muted)]">
                      {t("polls.groupsVoted", {
                        voted: poll.groupsVoted,
                        total: poll.totalGroups,
                      })}
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {draftPolls.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--stroke)] pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--accent-strong)]">
                {t("polls.draftsTitle")}
              </p>
              <ul className="space-y-2">
                {draftPolls.slice(0, 3).map((poll) => (
                  <li key={poll.id}>
                    <Link
                      href={`/admin/polls/${poll.id}/edit`}
                      className="text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    >
                      {poll.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Fundraising Section */}
        <section
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          data-testid="admin-overview-fundraising"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("fundraising.title")}</h2>
            <Link
              href="/admin/fundraising/new"
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            >
              {t("fundraising.new")}
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {openCampaigns.length === 0 ? (
              <li className="text-[color:var(--muted)]">{t("fundraising.empty")}</li>
            ) : (
              openCampaigns.slice(0, 4).map((campaign) => (
                <li
                  key={campaign.id}
                  className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3"
                >
                  <Link href={`/admin/fundraising/${campaign.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)]">
                        {campaign.title}
                      </p>
                        {campaign.pendingCount > 0 && (
                        <span className="shrink-0 rounded-full border border-[color:var(--accent-strong)] bg-[color:var(--surface)] px-2 py-0.5 text-xs text-[color:var(--accent-strong)]">
                          {t("fundraising.pending", {
                            count: campaign.pendingCount,
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[color:var(--muted)]">
                          {t("fundraising.progress", {
                            collected: formatCurrency(campaign.collectedAmount, locale),
                            goal: formatCurrency(Number(campaign.goalAmount), locale),
                          })}
                        </span>
                        <span className="text-[color:var(--accent)]">
                          {Math.round(campaign.progress)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--stroke)]">
                        <div
                          className="h-full rounded-full bg-[color:var(--accent)] transition-all"
                          style={{ width: `${campaign.progress}%` }}
                        />
                      </div>
                    </div>
                    {campaign.dueDate && (
                      <p className="mt-2 text-xs text-[color:var(--muted)]">
                        {t("fundraising.due", {
                          date: formatDate(campaign.dueDate, locale),
                        })}
                      </p>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
          {pendingContributions.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--stroke)] pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--accent-strong)]">
                {t("fundraising.reviewTitle")}
              </p>
              <ul className="space-y-2">
                {pendingContributions.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/fundraising/${c.campaignId}`}
                      className="flex items-center justify-between text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    >
                      <span>
                        {c.groupName} — {c.campaignTitle}
                      </span>
                      <span className="text-[color:var(--accent)]">
                        {formatCurrency(Number(c.amount), locale)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Events Section */}
        <section
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          data-testid="admin-overview-events"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("events.title")}</h2>
            <Link
              href="/admin/events/new"
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            >
              {t("events.new")}
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {upcomingEvents.length === 0 ? (
              <li className="text-[color:var(--muted)]">{t("events.empty")}</li>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => (
                <li
                  key={event.id}
                  className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3"
                >
                  <Link href={`/admin/events/${event.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-[var(--foreground)]">{event.title}</p>
                      <span className="shrink-0 text-xs text-[color:var(--accent)]">
                        {formatDateTime(event.startsAt, locale)}
                      </span>
                    </div>
                    {event.location && (
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {event.location}
                      </p>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Posts Section */}
        <section
          className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
          data-testid="admin-overview-posts"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("posts.title")}</h2>
            <Link
              href="/admin/posts/new"
              className="text-xs text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            >
              {t("posts.new")}
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {recentPosts.length === 0 ? (
              <li className="text-[color:var(--muted)]">{t("posts.empty")}</li>
            ) : (
              recentPosts
                .filter((p) => p.status === "published")
                .slice(0, 4)
                .map((post) => (
                  <li
                    key={post.id}
                    className="rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-4 py-3"
                  >
                    <Link href={`/admin/posts/${post.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-[var(--foreground)]">{post.title}</p>
                        {post.publishedAt && (
                          <span className="shrink-0 text-xs text-[color:var(--muted)]">
                            {formatDate(post.publishedAt, locale)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-[color:var(--muted)]">
                        {post.content.substring(0, 80)}...
                      </p>
                    </Link>
                  </li>
                ))
            )}
          </ul>
          {draftPosts.length > 0 && (
            <div className="mt-4 border-t border-[color:var(--stroke)] pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[color:var(--accent-strong)]">
                {t("posts.draftsTitle")}
              </p>
              <ul className="space-y-2">
                {draftPosts.slice(0, 3).map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
                    >
                      {post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
