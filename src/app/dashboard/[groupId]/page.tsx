import Link from "next/link";
import { redirect } from "next/navigation";

import { listEventsPaged } from "@/services/events";
import { listCampaignsPaged } from "@/services/fundraising";
import { listPollsPaged } from "@/services/polls";
import { listPostsPaged } from "@/services/posts";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function DashboardPage({
  params,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const members = await listGroupMembers(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const polls = await listPollsPaged(serviceContext, {
    limit: 5,
    offset: 0,
  });
  const events = await listEventsPaged(serviceContext, {
    limit: 5,
    offset: 0,
  });
  const posts = await listPostsPaged(serviceContext, {
    limit: 5,
    offset: 0,
  });
  const campaigns = await listCampaignsPaged(serviceContext, {
    status: "open",
    limit: 5,
    offset: 0,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Neighborhood overview</p>
        <h1 className="text-3xl font-semibold">{group.name}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Overview for this house group.
        </p>
      </header>

      {/* Posts Section */}
      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Latest Posts</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {posts.total} post{posts.total !== 1 ? "s" : ""} published
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/posts`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            View all posts
          </Link>
        </div>

        {posts.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">No posts yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {posts.items.map((post) => (
              <li key={post.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/posts/${post.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)] transition group-hover:text-[color:var(--accent)]">
                      {post.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">
                      {post.content}
                    </p>
                    <p className="mt-2 text-xs text-[color:var(--muted)]">
                      {new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(post.createdAt)}
                      {post.creatorName && (
                        <span className="ml-2">
                          &bull; by {post.creatorName}
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[rgba(245,239,228,0.4)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Events Section */}
      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Upcoming Events</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {events.total} event{events.total !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/events`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            View all events
          </Link>
        </div>

        {events.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">No upcoming events yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {events.items.map((event) => (
              <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/events/${event.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)] transition group-hover:text-[color:var(--accent)]">
                      {event.title}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(event.startsAt)}
                      {event.location && (
                        <span className="ml-2 text-[color:var(--muted)]">
                          &bull; {event.location}
                        </span>
                      )}
                    </p>
                    {event.creatorName && (
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        by {event.creatorName}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[rgba(245,239,228,0.4)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Polls Section */}
      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Active Polls</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {polls.total} poll{polls.total !== 1 ? "s" : ""} available
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/polls`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            View all polls
          </Link>
        </div>

        {polls.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">No active polls yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {polls.items.map((poll) => (
              <li key={poll.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/polls/${poll.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)] transition group-hover:text-[color:var(--accent)]">
                      {poll.title}
                    </p>
                    {poll.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--muted)]">
                        {poll.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-[color:var(--muted)]">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        poll.status === "active"
                          ? "border-[rgba(102,185,165,0.45)] bg-[rgba(102,185,165,0.2)] text-[color:var(--accent-cool)]"
                          : poll.status === "draft"
                          ? "border-white/15 bg-white/5 text-[color:var(--muted)]"
                          : "border-rose-500/40 bg-rose-500/15 text-rose-200"
                      }`}>
                        {poll.status}
                      </span>
                      {poll.creatorName && (
                        <span className="ml-2">
                          &bull; by {poll.creatorName}
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[rgba(245,239,228,0.4)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Fundraising Section */}
      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Active Campaigns</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {campaigns.total} open campaign{campaigns.total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/fundraising`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            View all campaigns
          </Link>
        </div>

        {campaigns.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">No active campaigns.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {campaigns.items.map((campaign) => (
              <li key={campaign.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)] transition group-hover:text-[color:var(--accent)]">
                      {campaign.title}
                    </p>
                    <p className="mt-1 text-sm text-[color:var(--muted)]">
                      <span className="text-[color:var(--accent)] font-medium">
                        Goal: ${Number(campaign.goalAmount).toLocaleString()}
                      </span>
                      <span className="ml-2 text-[color:var(--muted)]">
                        (${Number(campaign.amount).toLocaleString()} per group)
                      </span>
                    </p>
                    {campaign.dueDate && (
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        Due {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(campaign.dueDate))}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[rgba(245,239,228,0.4)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Members Section */}
      <section className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Group Members</h2>
            <p className="text-sm text-[color:var(--muted)]">
              {members.length} member{members.length !== 1 ? "s" : ""} in this group
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/members`}
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            View all members
          </Link>
        </div>

        {members.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">No members yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-white/10">
            {members.slice(0, 5).map((member) => (
              <li key={member.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(225,177,94,0.18)] text-sm font-medium text-[color:var(--muted-strong)]">
                    {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[var(--foreground)]">
                      {member.name}
                    </p>
                    <p className="text-sm text-[color:var(--muted)]">
                      {member.email}
                    </p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                    member.role === "admin"
                      ? "border-[rgba(225,177,94,0.5)] bg-[rgba(225,177,94,0.2)] text-[color:var(--accent)]"
                      : "border-white/10 bg-white/5 text-[color:var(--muted)]"
                  }`}>
                    {member.role}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
