import Link from "next/link";
import { redirect } from "next/navigation";

import { listEventsPaged } from "@/services/events";
import { listPaymentRequestsPaged } from "@/services/payments";
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
  const payments = await listPaymentRequestsPaged(serviceContext, {
    status: "open",
    limit: 5,
    offset: 0,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{group.name}</h1>
        <p className="text-sm text-slate-400">
          Overview for this house group.
        </p>
      </header>

      {/* Posts Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Latest Posts</h2>
            <p className="text-sm text-slate-400">
              {posts.total} post{posts.total !== 1 ? "s" : ""} published
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/posts`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View all posts
          </Link>
        </div>

        {posts.items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No posts yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800">
            {posts.items.map((post) => (
              <li key={post.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/posts/${post.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100 group-hover:text-emerald-300 transition">
                      {post.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {post.content}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
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
                    className="mt-1 h-5 w-5 flex-shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
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
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Upcoming Events</h2>
            <p className="text-sm text-slate-400">
              {events.total} event{events.total !== 1 ? "s" : ""} scheduled
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/events`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View all events
          </Link>
        </div>

        {events.items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No upcoming events yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800">
            {events.items.map((event) => (
              <li key={event.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/events/${event.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100 group-hover:text-emerald-300 transition">
                      {event.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(event.startsAt)}
                      {event.location && (
                        <span className="ml-2 text-slate-500">
                          &bull; {event.location}
                        </span>
                      )}
                    </p>
                    {event.creatorName && (
                      <p className="mt-1 text-xs text-slate-500">
                        by {event.creatorName}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
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
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Active Polls</h2>
            <p className="text-sm text-slate-400">
              {polls.total} poll{polls.total !== 1 ? "s" : ""} available
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/polls`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View all polls
          </Link>
        </div>

        {polls.items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No active polls yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800">
            {polls.items.map((poll) => (
              <li key={poll.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/polls/${poll.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100 group-hover:text-emerald-300 transition">
                      {poll.title}
                    </p>
                    {poll.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                        {poll.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        poll.status === "active"
                          ? "bg-emerald-900/50 text-emerald-300"
                          : poll.status === "draft"
                          ? "bg-slate-700/50 text-slate-400"
                          : "bg-red-900/50 text-red-300"
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
                    className="mt-1 h-5 w-5 flex-shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
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

      {/* Payments Section */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Open Payments</h2>
            <p className="text-sm text-slate-400">
              {payments.total} open request{payments.total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/payments`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View all payments
          </Link>
        </div>

        {payments.items.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No open payment requests.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800">
            {payments.items.map((payment) => (
              <li key={payment.id} className="py-4 first:pt-0 last:pb-0">
                <Link
                  href={`/dashboard/${resolvedParams.groupId}/payments/${payment.id}`}
                  className="group flex items-start justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100 group-hover:text-emerald-300 transition">
                      {payment.title}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      <span className="text-emerald-300 font-medium">
                        ${Number(payment.amount).toFixed(2)}
                      </span>
                      <span className="ml-1 text-slate-500">per group</span>
                      {payment.dueDate && (
                        <span className="ml-2 text-slate-500">
                          &bull; Due {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(payment.dueDate))}
                        </span>
                      )}
                    </p>
                    {payment.creatorName && (
                      <p className="mt-1 text-xs text-slate-500">
                        by {payment.creatorName}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
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
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Group Members</h2>
            <p className="text-sm text-slate-400">
              {members.length} member{members.length !== 1 ? "s" : ""} in this group
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/members`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-emerald-300 hover:text-emerald-200"
          >
            View all members
          </Link>
        </div>

        {members.length === 0 ? (
          <p className="mt-6 text-sm text-slate-400">No members yet.</p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-800">
            {members.slice(0, 5).map((member) => (
              <li key={member.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-slate-300">
                    {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-100">
                      {member.name}
                    </p>
                    <p className="text-sm text-slate-400">
                      {member.email}
                    </p>
                  </div>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    member.role === "admin"
                      ? "bg-amber-900/50 text-amber-300"
                      : "bg-slate-700/50 text-slate-400"
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
