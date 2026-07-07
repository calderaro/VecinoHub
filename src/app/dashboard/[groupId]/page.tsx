import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRightIcon } from "lucide-react";

import {
  DashboardIntro,
  EventsCard,
  FundsCard,
  FundraisingCard,
  MembersCard,
  PollsCard,
  PostsCard,
  ResourcesCard,
} from "@/components/dashboard-v2";
import {
  formatDashboardDate,
  formatDashboardDateTime,
  formatDashboardNumber,
  getAvatarFallback,
  getDaysUntil,
  getEventBadgeDate,
  toPostSnippet,
} from "@/components/dashboard-v2/mappers";
import { listEventsPaged } from "@/services/events";
import { listNeighborhoodFunds } from "@/services/funds";
import { listCampaignsPaged } from "@/services/fundraising";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { listPollsPaged } from "@/services/polls";
import { listPostsPaged } from "@/services/posts";
import { listResourcesForGroup } from "@/services/resources";
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
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, {
    groupId: resolvedParams.groupId,
  });
  const scopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  // These 8 fetches are independent (they only need group/scopedContext), so
  // run them concurrently instead of as a sequential await waterfall.
  const [members, neighborhood, polls, events, posts, campaigns, resourceList, funds] =
    await Promise.all([
      listGroupMembers(scopedContext, { groupId: resolvedParams.groupId }),
      getNeighborhoodById(scopedContext, { neighborhoodId: group.neighborhoodId }),
      listPollsPaged(scopedContext, { limit: 5, offset: 0 }),
      listEventsPaged(scopedContext, { limit: 5, offset: 0 }),
      listPostsPaged(scopedContext, { limit: 5, offset: 0 }),
      listCampaignsPaged(scopedContext, { status: "open", limit: 5, offset: 0 }),
      listResourcesForGroup(scopedContext, { groupId: resolvedParams.groupId }),
      listNeighborhoodFunds(scopedContext, { neighborhoodId: group.neighborhoodId }),
    ]);

  const locale = await getLocale();
  const t = await getTranslations("dashboard.overview");
  const tStatus = await getTranslations("status");

  const postItems = posts.items.map((post) => {
    const author = post.creatorName ?? "VecinoHub";
    const avatar = getAvatarFallback(author);

    return {
      id: post.id,
      href: `/dashboard/${resolvedParams.groupId}/posts/${post.id}`,
      title: post.title,
      snippet: toPostSnippet(post.content),
      author,
      dateLabel: formatDashboardDate(post.createdAt, locale),
      avatarInitial: avatar.initial,
      avatarColorClass: avatar.colorClass,
    };
  });

  const eventItems = events.items.map((event) => {
    const badge = getEventBadgeDate(event.startsAt, locale, neighborhood.timeZone);

    return {
      id: event.id,
      href: `/dashboard/${resolvedParams.groupId}/events/${event.id}`,
      title: event.title,
      month: badge.month,
      day: badge.day,
      dateTimeLabel: formatDashboardDateTime(event.startsAt, locale, neighborhood.timeZone),
      location: event.location,
    };
  });

  const pollItems = polls.items.map((poll) => ({
    id: poll.id,
    href: `/dashboard/${resolvedParams.groupId}/polls/${poll.id}`,
    title: poll.title,
    description: poll.description,
    creatorName: poll.creatorName,
    status: poll.status,
    statusLabel: tStatus(poll.status),
  }));

  const fundraisingItems = campaigns.items.map((campaign) => {
    const daysUntil = campaign.dueDate ? getDaysUntil(campaign.dueDate, neighborhood.timeZone) : null;
    const urgencyLabel =
      daysUntil !== null && daysUntil <= 14 && daysUntil > 0
        ? t("fundraising.daysLeft", { count: daysUntil })
        : null;

    return {
      id: campaign.id,
      href: `/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}`,
      title: campaign.title,
      goalLabel: t("fundraising.goal", {
        amount: formatDashboardNumber(campaign.goalAmount, locale),
      }),
      perGroupLabel: t("fundraising.perGroup", {
        amount: formatDashboardNumber(campaign.amount, locale),
      }),
      dueLabel: campaign.dueDate
        ? t("fundraising.due", {
            date: formatDashboardDate(campaign.dueDate, locale, neighborhood.timeZone),
          })
        : null,
      urgencyLabel,
    };
  });

  const fundItems = funds.slice(0, 5).map((fund) => ({
    id: fund.id,
    href: `/dashboard/${resolvedParams.groupId}/fund/${fund.id}`,
    title: fund.name,
    balanceLabel: t("funds.balance", {
      amount: formatDashboardNumber(fund.balance, locale),
    }),
    periodsLabel: t("funds.periods", { count: fund.openPeriods }),
    statusLabel: t("funds.pending", { count: fund.pendingPayments }),
  }));

  const resourceItems = resourceList.slice(0, 5).map((resource) => ({
    id: resource.id,
    href: `/dashboard/${resolvedParams.groupId}/resources/${resource.id}`,
    title: resource.name,
    subtitle: resource.location || resource.type || t("resources.noDescription"),
    statusLabel: t("resources.upcoming", { count: resource.groupUpcomingReservations }),
  }));

  const memberItems = members.slice(0, 5).map((member) => {
    const name = member.name ?? member.username ?? member.email;
    const avatar = getAvatarFallback(member.name ?? member.email);

    return {
      id: member.id,
      name,
      email: member.email,
      role: member.membershipRole,
      roleLabel: t(`members.roles.${member.membershipRole}`),
      avatarInitial: avatar.initial,
      avatarColorClass: avatar.colorClass,
    };
  });

  return (
    <main
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10"
      data-testid="dashboard-overview-root"
    >
      <DashboardIntro
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{group.neighborhoodName}</span>
            <ChevronRightIcon className="h-6 w-6 text-stone-400" aria-hidden="true" />
            <span>{group.name}</span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PostsCard
          title={t("posts.title")}
          viewAllLabel={t("posts.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/posts`}
          emptyTitle={t("posts.empty")}
          emptyBody={t("posts.emptyHint")}
          totalCount={posts.total}
          items={postItems}
          testId="dashboard-overview-posts"
        />

        <EventsCard
          title={t("events.title")}
          viewAllLabel={t("events.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/events`}
          emptyTitle={t("events.empty")}
          emptyBody={t("events.emptyHint")}
          totalCount={events.total}
          items={eventItems}
          testId="dashboard-overview-events"
        />

        <PollsCard
          title={t("polls.title")}
          viewAllLabel={t("polls.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/polls`}
          emptyTitle={t("polls.empty")}
          emptyBody={t("polls.emptyHint")}
          totalCount={polls.total}
          items={pollItems}
          testId="dashboard-overview-polls"
        />

        <FundraisingCard
          title={t("fundraising.title")}
          viewAllLabel={t("fundraising.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/fundraising`}
          emptyTitle={t("fundraising.empty")}
          emptyBody={t("fundraising.emptyHint")}
          totalCount={campaigns.total}
          items={fundraisingItems}
          testId="dashboard-overview-fundraising"
        />

        <FundsCard
          title={t("funds.title")}
          viewAllLabel={t("funds.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/fund`}
          emptyTitle={t("funds.empty")}
          emptyBody={t("funds.emptyHint")}
          totalCount={funds.length}
          items={fundItems}
          testId="dashboard-overview-funds"
        />

        <ResourcesCard
          title={t("resources.title")}
          viewAllLabel={t("resources.viewAll")}
          viewAllHref={`/dashboard/${resolvedParams.groupId}/resources`}
          emptyTitle={t("resources.empty")}
          emptyBody={t("resources.emptyHint")}
          totalCount={resourceList.length}
          items={resourceItems}
          testId="dashboard-overview-resources"
        />

        <div className="lg:col-span-2">
          <MembersCard
            title={t("members.title")}
            viewAllLabel={t("members.viewAll")}
            viewAllHref={`/dashboard/${resolvedParams.groupId}/members`}
            emptyTitle={t("members.empty")}
            emptyBody={t("members.emptyHint")}
            totalCount={members.length}
            items={memberItems}
            testId="dashboard-overview-members"
          />
        </div>
      </div>
    </main>
  );
}
