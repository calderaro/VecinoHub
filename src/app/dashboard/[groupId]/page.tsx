import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import {
  DashboardIntro,
  EventsCard,
  FundraisingCard,
  MembersCard,
  PollsCard,
  PostsCard,
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
import { listCampaignsPaged } from "@/services/fundraising";
import { getGroupById, listGroupMembers } from "@/services/groups";
import { listPollsPaged } from "@/services/polls";
import { listPostsPaged } from "@/services/posts";
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
  const members = await listGroupMembers(scopedContext, {
    groupId: resolvedParams.groupId,
  });
  const polls = await listPollsPaged(scopedContext, {
    limit: 5,
    offset: 0,
  });
  const events = await listEventsPaged(scopedContext, {
    limit: 5,
    offset: 0,
  });
  const posts = await listPostsPaged(scopedContext, {
    limit: 5,
    offset: 0,
  });
  const campaigns = await listCampaignsPaged(scopedContext, {
    status: "open",
    limit: 5,
    offset: 0,
  });

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
    const badge = getEventBadgeDate(event.startsAt, locale);

    return {
      id: event.id,
      href: `/dashboard/${resolvedParams.groupId}/events/${event.id}`,
      title: event.title,
      month: badge.month,
      day: badge.day,
      dateTimeLabel: formatDashboardDateTime(event.startsAt, locale),
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
    const daysUntil = campaign.dueDate ? getDaysUntil(campaign.dueDate) : null;

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
            date: formatDashboardDate(new Date(campaign.dueDate), locale),
          })
        : null,
      isUrgent: daysUntil !== null && daysUntil <= 14 && daysUntil > 0,
      daysUntil,
    };
  });

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
      <DashboardIntro eyebrow={t("label")} title={group.name} description={t("subtitle")} />

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
