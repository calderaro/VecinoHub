import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { formatPortDate } from "@/lib/port-time";
import { getGroupById } from "@/services/groups";
import { hasNeighborhoodAdminRole } from "@/services/neighborhoods";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

export default async function NeighborPostDetailPage({
  params,
}: {
  params: { groupId: string; postId: string } | Promise<{ groupId: string; postId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId: resolvedParams.groupId });
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };
  const [post, canAccessAdmin, neighborhood] = await Promise.all([
    getPostById(serviceContext, { postId: resolvedParams.postId }),
    hasNeighborhoodAdminRole(baseContext),
    getNeighborhoodById(serviceContext, {
      neighborhoodId: group.neighborhoodId,
    }),
  ]);
  const adminBasePath = `/admin/${group.neighborhoodId}`;
  const locale = await getLocale();
  const t = await getTranslations("dashboard.postDetail");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{post.title}</h1>
          <p className="text-sm text-[color:var(--muted)]">
            {t("published", {
              date: post.publishedAt
                ? formatPortDate(post.publishedAt, neighborhood.timeZone, locale, {
                    dateStyle: "full",
                  })
                : t("emptyDate"),
            })}
          </p>
        </div>
        {canAccessAdmin ? (
          <Link
            className="rounded-full border border-[color:var(--stroke)] bg-[color:var(--surface)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`${adminBasePath}/posts/${post.id}`}
          >
            {t("adminView")}
          </Link>
        ) : null}
      </header>

      <div className="rounded-xl border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-sm">
        <div className="space-y-3 text-sm text-[color:var(--foreground)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("content")}
          </p>
          <p className="whitespace-pre-line text-[color:var(--muted-strong)]">
            {post.content}
          </p>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] hover:text-[color:var(--accent)]"
        href={`/dashboard/${resolvedParams.groupId}/posts`}
      >
        {t("back")}
      </Link>
    </div>
  );
}
