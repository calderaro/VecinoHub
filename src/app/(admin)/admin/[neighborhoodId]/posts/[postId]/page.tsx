import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";

import { formatPortDate } from "@/lib/port-time";
import { PostDetailActions } from "@/components/posts/post-detail-actions";
import { StatusBadge } from "@/components/ui-v3";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

export default async function AdminPostDetailPage({
  params,
}: {
  params:
    | { neighborhoodId: string; postId: string }
    | Promise<{ neighborhoodId: string; postId: string }>;
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
  const [post, locale, t, tStatus, neighborhood] = await Promise.all([
    getPostById(serviceContext, { postId: resolvedParams.postId }),
    getLocale(),
    getTranslations("admin.postDetail"),
    getTranslations("status"),
    getNeighborhoodById(serviceContext, {
      neighborhoodId: resolvedParams.neighborhoodId,
    }),
  ]);

  const postWithMeta = post as typeof post & { creatorName?: string };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm text-stone-500 transition-colors hover:text-stone-700"
        href={`${adminBasePath}/posts`}
        data-testid="post-detail-back"
      >
        <ArrowLeftIcon className="h-4 w-4" /> {t("back")}
      </Link>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-widest text-blue-600">
                Platform Post
              </p>
              <h1 className="mb-2 text-xl font-bold text-stone-900">{post.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge variant={post.status} label={tStatus(post.status)} />
                <span className="text-xs text-stone-400">by {postWithMeta.creatorName ?? "-"}</span>
                <span className="text-xs text-stone-400">
                  Created {formatPortDate(post.createdAt, neighborhood.timeZone, locale)}
                </span>
                {post.publishedAt ? (
                  <span className="text-xs text-stone-400">
                    {t("publishedLabel")} {formatPortDate(post.publishedAt, neighborhood.timeZone, locale)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`${adminBasePath}/posts/${post.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50"
                data-testid="post-detail-edit"
              >
                <PencilIcon className="h-3.5 w-3.5" /> {t("edit")}
              </Link>
              <PostDetailActions
                postId={post.id}
                status={post.status}
                adminBasePath={adminBasePath}
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-600">{post.content}</p>
        </div>
      </section>
    </div>
  );
}
