import { redirect } from "next/navigation";
import Link from "next/link";

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleDateString("es-MX", {
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin Overview</h1>
        <p className="text-sm text-slate-400">
          Activity summary for polls, fundraising, events, and posts.
        </p>
      </header>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/polls"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/80"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Active Polls
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {pollsStats.active}
          </p>
          {pollsStats.drafts > 0 && (
            <p className="mt-1 text-xs text-amber-400">
              {pollsStats.drafts} draft{pollsStats.drafts !== 1 && "s"} pending
            </p>
          )}
        </Link>

        <Link
          href="/admin/fundraising"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/80"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Open Campaigns
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {fundraisingStats.openCampaigns}
          </p>
          {fundraisingStats.pendingContributions > 0 && (
            <p className="mt-1 text-xs text-amber-400">
              {fundraisingStats.pendingContributions} contribution
              {fundraisingStats.pendingContributions !== 1 && "s"} to review
            </p>
          )}
        </Link>

        <Link
          href="/admin/events"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/80"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Upcoming Events
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {eventsStats.upcoming}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {eventsStats.total} total
          </p>
        </Link>

        <Link
          href="/admin/posts"
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition-colors hover:border-slate-700 hover:bg-slate-900/80"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Published Posts
          </p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {postsStats.published}
          </p>
          {postsStats.drafts > 0 && (
            <p className="mt-1 text-xs text-amber-400">
              {postsStats.drafts} draft{postsStats.drafts !== 1 && "s"} to publish
            </p>
          )}
        </Link>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Polls Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Active Polls</h2>
            <Link
              href="/admin/polls/new"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + New poll
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {activePolls.length === 0 ? (
              <li className="text-slate-500">No active polls.</li>
            ) : (
              activePolls.slice(0, 5).map((poll) => (
                <li
                  key={poll.id}
                  className="rounded-lg border border-slate-800/80 px-4 py-3"
                >
                  <Link href={`/admin/polls/${poll.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-200">{poll.title}</p>
                      <span className="shrink-0 rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs text-emerald-300">
                        {poll.participation}% participation
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {poll.groupsVoted} of {poll.totalGroups} groups voted
                    </p>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {draftPolls.length > 0 && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400">
                Drafts needing attention
              </p>
              <ul className="space-y-2">
                {draftPolls.slice(0, 3).map((poll) => (
                  <li key={poll.id}>
                    <Link
                      href={`/admin/polls/${poll.id}/edit`}
                      className="text-sm text-slate-400 hover:text-slate-200"
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
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Fundraising Campaigns</h2>
            <Link
              href="/admin/fundraising/new"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + New campaign
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {openCampaigns.length === 0 ? (
              <li className="text-slate-500">No open campaigns.</li>
            ) : (
              openCampaigns.slice(0, 4).map((campaign) => (
                <li
                  key={campaign.id}
                  className="rounded-lg border border-slate-800/80 px-4 py-3"
                >
                  <Link href={`/admin/fundraising/${campaign.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-200">
                        {campaign.title}
                      </p>
                      {campaign.pendingCount > 0 && (
                        <span className="shrink-0 rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                          {campaign.pendingCount} pending
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {formatCurrency(campaign.collectedAmount)} of{" "}
                          {formatCurrency(Number(campaign.goalAmount))}
                        </span>
                        <span className="text-emerald-400">
                          {Math.round(campaign.progress)}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${campaign.progress}%` }}
                        />
                      </div>
                    </div>
                    {campaign.dueDate && (
                      <p className="mt-2 text-xs text-slate-500">
                        Due: {formatDate(campaign.dueDate)}
                      </p>
                    )}
                  </Link>
                </li>
              ))
            )}
          </ul>
          {pendingContributions.length > 0 && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400">
                Contributions to review
              </p>
              <ul className="space-y-2">
                {pendingContributions.slice(0, 4).map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/admin/fundraising/${c.campaignId}`}
                      className="flex items-center justify-between text-sm text-slate-400 hover:text-slate-200"
                    >
                      <span>
                        {c.groupName} — {c.campaignTitle}
                      </span>
                      <span className="text-emerald-400">
                        {formatCurrency(Number(c.amount))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Events Section */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming Events</h2>
            <Link
              href="/admin/events/new"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + New event
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {upcomingEvents.length === 0 ? (
              <li className="text-slate-500">No upcoming events.</li>
            ) : (
              upcomingEvents.slice(0, 5).map((event) => (
                <li
                  key={event.id}
                  className="rounded-lg border border-slate-800/80 px-4 py-3"
                >
                  <Link href={`/admin/events/${event.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-200">{event.title}</p>
                      <span className="shrink-0 text-xs text-emerald-400">
                        {formatDateTime(event.startsAt)}
                      </span>
                    </div>
                    {event.location && (
                      <p className="mt-1 text-xs text-slate-500">
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
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Posts</h2>
            <Link
              href="/admin/posts/new"
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              + New post
            </Link>
          </div>
          <ul className="mt-4 space-y-3 text-sm">
            {recentPosts.length === 0 ? (
              <li className="text-slate-500">No posts yet.</li>
            ) : (
              recentPosts
                .filter((p) => p.status === "published")
                .slice(0, 4)
                .map((post) => (
                  <li
                    key={post.id}
                    className="rounded-lg border border-slate-800/80 px-4 py-3"
                  >
                    <Link href={`/admin/posts/${post.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-200">{post.title}</p>
                        {post.publishedAt && (
                          <span className="shrink-0 text-xs text-slate-500">
                            {formatDate(post.publishedAt)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                        {post.content.substring(0, 80)}...
                      </p>
                    </Link>
                  </li>
                ))
            )}
          </ul>
          {draftPosts.length > 0 && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-amber-400">
                Drafts to publish
              </p>
              <ul className="space-y-2">
                {draftPosts.slice(0, 3).map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/admin/posts/${post.id}/edit`}
                      className="text-sm text-slate-400 hover:text-slate-200"
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
