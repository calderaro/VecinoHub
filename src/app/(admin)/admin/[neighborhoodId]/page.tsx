import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  MembersCard,
} from "@/components/dashboard-v2";
import {
  getAvatarFallback,
} from "@/components/dashboard-v2/mappers";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  Building2Icon,
  CalendarIcon,
  CoinsIcon,
  FileTextIcon,
  PlusIcon,
  UsersIcon,
  VoteIcon,
} from "lucide-react";

import { StatusBadge } from "@/components/ui-v3";
import { listUpcomingEvents, getEventsStats } from "@/services/events";
import {
  listOpenCampaignsWithProgress,
  getFundraisingStats,
} from "@/services/fundraising";
import { getGroupsStats } from "@/services/groups";
import { listNeighborhoodMembersPaged, getNeighborhoodById } from "@/services/neighborhoods";
import {
  listActivePollsWithParticipation,
  getPollsStats,
} from "@/services/polls";
import { listRecentPosts, getPostsStats } from "@/services/posts";
import { listNeighborhoodGroupUsersPaged } from "@/services/users";
import { getSession } from "@/server/auth";

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

function formatMonth(date: Date | string, locale: string) {
  return new Date(date).toLocaleDateString(getDisplayLocale(locale), {
    month: "short",
  });
}

type KpiStat = {
  label: string;
  value: number;
  color?: string;
};

function KpiCard({
  href,
  title,
  icon,
  iconBg,
  stats,
  testId,
}: {
  href: string;
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  stats: KpiStat[];
  testId?: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-stone-200 bg-white p-5 text-left shadow-sm transition-all hover:border-stone-300 hover:shadow"
      data-testid={testId}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <p className="text-sm font-semibold text-stone-700">{title}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className={`text-xl font-bold tabular-nums ${stat.color ?? "text-stone-900"}`}>
              {stat.value}
            </p>
            <p className="mt-0.5 truncate text-[11px] leading-4 text-stone-400">{stat.label}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

export default async function AdminNeighborhoodPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const neighborhoodId = resolvedParams.neighborhoodId;
  const adminBasePath = `/admin/${neighborhoodId}`;
  const baseContext = { user: session.user };
  const neighborhood = await getNeighborhoodById(baseContext, {
    neighborhoodId,
  }).catch(() => null);

  if (!neighborhood) {
    redirect("/admin");
  }

  const locale = await getLocale();
  const t = await getTranslations("admin.overview");
  const tNav = await getTranslations("admin.nav");
  const tNeighborhoodMembers = await getTranslations("admin.neighborhoodMembersManager");
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: neighborhoodId,
    },
  };

  const [
    pollsStats,
    activePolls,
    fundraisingStats,
    openCampaigns,
    eventsStats,
    upcomingEvents,
    postsStats,
    recentPosts,
    groupsStats,
    groupUsersActive,
    groupUsersInactive,
    groupUsersTotal,
    neighborhoodMembers,
  ] = await Promise.all([
    getPollsStats(serviceContext),
    listActivePollsWithParticipation(serviceContext),
    getFundraisingStats(serviceContext),
    listOpenCampaignsWithProgress(serviceContext),
    getEventsStats(serviceContext),
    listUpcomingEvents(serviceContext),
    getPostsStats(serviceContext),
    listRecentPosts(serviceContext),
    getGroupsStats(serviceContext, { neighborhoodId }),
    listNeighborhoodGroupUsersPaged(serviceContext, {
      neighborhoodId,
      status: "active",
      limit: 1,
      offset: 0,
    }),
    listNeighborhoodGroupUsersPaged(serviceContext, {
      neighborhoodId,
      status: "inactive",
      limit: 1,
      offset: 0,
    }),
    listNeighborhoodGroupUsersPaged(serviceContext, {
      neighborhoodId,
      limit: 1,
      offset: 0,
    }),
    listNeighborhoodMembersPaged(serviceContext, {
      neighborhoodId,
      role: "neighborhood_admin",
      limit: 5,
      offset: 0,
    }),
  ]);

  const neighborhoodMemberItems = [...neighborhoodMembers.items]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((member) => {
      const avatar = getAvatarFallback(member.name ?? member.email);

      return {
        id: member.userId,
        name: member.username ?? member.name,
        email: member.email,
        role: member.membershipRole,
        roleLabel: tNeighborhoodMembers(`roles.${member.membershipRole}`),
        avatarInitial: avatar.initial,
        avatarColorClass: avatar.colorClass,
      };
    });

  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6"
      data-testid="admin-overview-root"
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-teal-600">{neighborhood.name}</p>
          <h1 className="text-xl font-bold text-stone-900" data-testid="admin-overview-title">
            {tNav("overview")}
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">{t("subtitle")}</p>
        </div>
        <Link
          href={`${adminBasePath}/polls/new`}
          className="vh-v3-focus flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          data-testid="admin-overview-quick-create"
        >
          <PlusIcon className="h-4 w-4" /> {t("quickCreate")}
        </Link>
      </header>

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        data-testid="admin-overview-stats"
      >
        <KpiCard
          href={`${adminBasePath}/polls`}
          title={tNav("polls")}
          icon={<VoteIcon className="h-4.5 w-4.5 text-violet-600" />}
          iconBg="bg-violet-50"
          testId="admin-overview-stats-polls"
          stats={[
            { label: t("kpi.polls.active"), value: pollsStats.active, color: "text-teal-600" },
            { label: t("kpi.polls.draft"), value: pollsStats.drafts, color: "text-amber-600" },
            { label: t("kpi.polls.closed"), value: pollsStats.closed },
          ]}
        />

        <KpiCard
          href={`${adminBasePath}/fundraising`}
          title={tNav("fundraising")}
          icon={<CoinsIcon className="h-4.5 w-4.5 text-amber-600" />}
          iconBg="bg-amber-50"
          testId="admin-overview-stats-fundraising"
          stats={[
            {
              label: t("kpi.fundraising.open"),
              value: fundraisingStats.openCampaigns,
              color: "text-teal-600",
            },
            { label: t("kpi.fundraising.paused"), value: 0, color: "text-violet-600" },
            {
              label: t("kpi.fundraising.pending"),
              value: fundraisingStats.pendingContributions,
              color: "text-amber-600",
            },
          ]}
        />

        <KpiCard
          href={`${adminBasePath}/events`}
          title={tNav("events")}
          icon={<CalendarIcon className="h-4.5 w-4.5 text-blue-600" />}
          iconBg="bg-blue-50"
          testId="admin-overview-stats-events"
          stats={[
            {
              label: t("kpi.events.upcoming"),
              value: eventsStats.upcoming,
              color: "text-blue-600",
            },
            {
              label: t("kpi.events.done"),
              value: Math.max(eventsStats.total - eventsStats.upcoming, 0),
            },
            { label: t("kpi.events.canceled"), value: 0, color: "text-red-500" },
          ]}
        />

        <KpiCard
          href={`${adminBasePath}/posts`}
          title={tNav("posts")}
          icon={<FileTextIcon className="h-4.5 w-4.5 text-teal-600" />}
          iconBg="bg-teal-50"
          testId="admin-overview-stats-posts"
          stats={[
            {
              label: t("kpi.posts.published"),
              value: postsStats.published,
              color: "text-teal-600",
            },
            { label: t("kpi.posts.draft"), value: postsStats.drafts, color: "text-amber-600" },
            { label: t("kpi.posts.hidden"), value: 0 },
          ]}
        />

        <KpiCard
          href={`${adminBasePath}/users`}
          title={tNav("users")}
          icon={<UsersIcon className="h-4.5 w-4.5 text-rose-600" />}
          iconBg="bg-rose-50"
          testId="admin-overview-stats-users"
          stats={[
            { label: t("kpi.users.active"), value: groupUsersActive.total, color: "text-teal-600" },
            {
              label: t("kpi.users.inactive"),
              value: groupUsersInactive.total,
              color: "text-red-500",
            },
            {
              label: t("kpi.users.total"),
              value: groupUsersTotal.total,
              color: "text-stone-900",
            },
          ]}
        />

        <KpiCard
          href={`${adminBasePath}/groups`}
          title={tNav("groups")}
          icon={<Building2Icon className="h-4.5 w-4.5 text-stone-600" />}
          iconBg="bg-stone-100"
          testId="admin-overview-stats-groups"
          stats={[
            { label: t("kpi.groups.active"), value: groupsStats.active, color: "text-teal-600" },
            { label: t("kpi.groups.inactive"), value: groupsStats.inactive },
            { label: t("kpi.groups.total"), value: groupsStats.total },
          ]}
        />
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          data-testid="admin-overview-polls"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <VoteIcon className="h-4 w-4 text-violet-600" />
              <h2 className="text-sm font-semibold text-stone-900">{t("polls.title")}</h2>
            </div>
            <Link
              href={`${adminBasePath}/polls`}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {activePolls.length === 0 ? (
              <div className="px-5 py-8 text-sm text-stone-500">{t("polls.empty")}</div>
            ) : (
              activePolls.slice(0, 4).map((poll) => (
                <Link
                  key={poll.id}
                  href={`${adminBasePath}/polls/${poll.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{poll.title}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {t("polls.votes", { count: poll.voteCount })}
                    </p>
                  </div>
                  <StatusBadge variant="active" label={t("kpi.polls.active")} />
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          data-testid="admin-overview-fundraising"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CoinsIcon className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-stone-900">{t("fundraising.title")}</h2>
              {fundraisingStats.pendingContributions > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600 ring-1 ring-amber-200">
                  <AlertCircleIcon className="h-3 w-3" />
                  {t("fundraising.pending", { count: fundraisingStats.pendingContributions })}
                </span>
              ) : null}
            </div>
            <Link
              href={`${adminBasePath}/fundraising`}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {openCampaigns.length === 0 ? (
              <div className="px-5 py-8 text-sm text-stone-500">{t("fundraising.empty")}</div>
            ) : (
              openCampaigns.slice(0, 3).map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`${adminBasePath}/fundraising/${campaign.id}`}
                  className="block px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="mr-3 truncate text-sm font-medium text-stone-900">{campaign.title}</p>
                    <span className="text-xs font-semibold tabular-nums text-teal-600">
                      {Math.round(campaign.progress)}%
                    </span>
                  </div>
                  <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-teal-500"
                      style={{ width: `${campaign.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-stone-400">
                    {t("fundraising.progress", {
                      collected: formatCurrency(campaign.collectedAmount, locale),
                      goal: formatCurrency(Number(campaign.goalAmount), locale),
                    })}
                    {campaign.pendingCount > 0 ? (
                      <span className="font-medium text-amber-600">
                        {" "}· {t("fundraising.pendingReview", { count: campaign.pendingCount })}
                      </span>
                    ) : (
                      <span> · {t("fundraising.allReviewed")}</span>
                    )}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          data-testid="admin-overview-events"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-stone-900">{t("events.title")}</h2>
            </div>
            <Link
              href={`${adminBasePath}/events`}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {upcomingEvents.length === 0 ? (
              <div className="px-5 py-8 text-sm text-stone-500">{t("events.empty")}</div>
            ) : (
              upcomingEvents.slice(0, 4).map((event) => (
                <Link
                  key={event.id}
                  href={`${adminBasePath}/events/${event.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  <div className="w-7 text-center">
                    <p className="text-[9px] font-bold uppercase leading-none text-blue-500">
                      {formatMonth(event.startsAt, locale)}
                    </p>
                    <p className="text-base font-bold leading-tight text-stone-900">
                      {new Date(event.startsAt).getDate()}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{event.title}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{event.location ?? "-"}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"
          data-testid="admin-overview-posts"
        >
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4 text-teal-600" />
              <h2 className="text-sm font-semibold text-stone-900">{t("posts.title")}</h2>
            </div>
            <Link
              href={`${adminBasePath}/posts`}
              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100">
            {recentPosts.length === 0 ? (
              <div className="px-5 py-8 text-sm text-stone-500">{t("posts.empty")}</div>
            ) : (
              recentPosts.slice(0, 4).map((post) => (
                <Link
                  key={post.id}
                  href={`${adminBasePath}/posts/${post.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-stone-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-900">{post.title}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-400">{post.creatorName ?? "-"}</p>
                  </div>
                  <StatusBadge
                    variant={post.status}
                    label={post.status === "published" ? t("kpi.posts.published") : t("kpi.posts.draft")}
                  />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <MembersCard
        title={t("membersSection.title")}
        viewAllLabel={t("membersSection.viewAll")}
        viewAllHref={`${adminBasePath}/members`}
        emptyTitle={t("membersSection.empty")}
        emptyBody={t("membersSection.emptyHint")}
        totalCount={neighborhoodMembers.total}
        items={neighborhoodMemberItems}
        testId="admin-overview-members"
      />
    </div>
  );
}
