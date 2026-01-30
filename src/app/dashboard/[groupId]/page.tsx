import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { listEventsPaged } from "@/services/events";
import { listCampaignsPaged } from "@/services/fundraising";
import { listPollsPaged } from "@/services/polls";
import { listPostsPaged } from "@/services/posts";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

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
  const locale = await getLocale();
  const t = await getTranslations("dashboard.overview");
  const tStatus = await getTranslations("status");

  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12"
      data-testid="dashboard-overview-root"
    >
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold" data-testid="dashboard-overview-title">
          {group.name}
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("subtitle")}
        </p>
      </header>

      {/* Posts Section */}
      <section
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-overview-posts"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t("posts.title")}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {t("posts.count", { count: posts.total })}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/posts`}
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            {t("posts.viewAll")}
          </Link>
        </div>

        {posts.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">{t("posts.empty")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-[color:var(--stroke)]">
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
                      {formatDate(post.createdAt, locale)}
                      {post.creatorName && (
                        <span className="ml-2">
                          &bull; {t("posts.by", { name: post.creatorName })}
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[color:var(--muted)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
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
      <section
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-overview-events"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t("events.title")}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {t("events.count", { count: events.total })}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/events`}
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            {t("events.viewAll")}
          </Link>
        </div>

        {events.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">
            {t("events.empty")}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[color:var(--stroke)]">
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
                      {formatDateTime(event.startsAt, locale)}
                      {event.location && (
                        <span className="ml-2 text-[color:var(--muted)]">
                          &bull; {event.location}
                        </span>
                      )}
                    </p>
                    {event.creatorName && (
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {t("events.by", { name: event.creatorName })}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[color:var(--muted)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
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
      <section
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-overview-polls"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t("polls.title")}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {t("polls.count", { count: polls.total })}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/polls`}
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            {t("polls.viewAll")}
          </Link>
        </div>

        {polls.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">{t("polls.empty")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-[color:var(--stroke)]">
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
                          ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                          : poll.status === "draft"
                          ? "border-[color:var(--stroke)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                          : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                      }`}>
                        {tStatus(poll.status)}
                      </span>
                      {poll.creatorName && (
                        <span className="ml-2">
                          &bull; {t("polls.by", { name: poll.creatorName })}
                        </span>
                      )}
                    </p>
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[color:var(--muted)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
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
      <section
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-overview-fundraising"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t("fundraising.title")}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {t("fundraising.count", { count: campaigns.total })}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/fundraising`}
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            {t("fundraising.viewAll")}
          </Link>
        </div>

        {campaigns.items.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">
            {t("fundraising.empty")}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-[color:var(--stroke)]">
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
                        {t("fundraising.goal", {
                          amount: Number(campaign.goalAmount).toLocaleString(),
                        })}
                      </span>
                      <span className="ml-2 text-[color:var(--muted)]">
                        {t("fundraising.perGroup", {
                          amount: Number(campaign.amount).toLocaleString(),
                        })}
                      </span>
                    </p>
                    {campaign.dueDate && (
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {t("fundraising.due", {
                          date: formatDate(new Date(campaign.dueDate), locale),
                        })}
                      </p>
                    )}
                  </div>
                  <svg
                    className="mt-1 h-5 w-5 flex-shrink-0 text-[color:var(--muted)] transition group-hover:translate-x-1 group-hover:text-[color:var(--accent-strong)]"
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
      <section
        className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]"
        data-testid="dashboard-overview-members"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">
              {t("members.title")}
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              {t("members.count", { count: members.length })}
            </p>
          </div>
          <Link
            href={`/dashboard/${resolvedParams.groupId}/members`}
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          >
            {t("members.viewAll")}
          </Link>
        </div>

        {members.length === 0 ? (
          <p className="mt-6 text-sm text-[color:var(--muted)]">{t("members.empty")}</p>
        ) : (
          <ul className="mt-6 divide-y divide-[color:var(--stroke)]">
            {members.slice(0, 5).map((member) => (
              <li key={member.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface-strong)] text-sm font-medium text-[color:var(--muted-strong)]">
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
                      ? "border-[color:var(--accent)] bg-[color:var(--surface)] text-[color:var(--accent)]"
                      : "border-[color:var(--stroke)] bg-[color:var(--surface-strong)] text-[color:var(--muted)]"
                  }`}>
                    {t(`members.roles.${member.role}`)}
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
