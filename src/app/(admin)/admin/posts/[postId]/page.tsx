import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { PostAdminActions } from "@/components/posts/post-admin-actions";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatDate(value: Date, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    dateStyle: "full",
  }).format(value);
}

export default async function AdminPostDetailPage({
  params,
}: {
  params: { postId: string } | Promise<{ postId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const post = await getPostById({ user: session.user }, resolvedParams);
  const locale = await getLocale();
  const t = await getTranslations("admin.postDetail");
  const tStatus = await getTranslations("status");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            <span>
              {t("statusLabel")}: {tStatus(post.status)}
            </span>
            <span>
              {t("publishedLabel")}: {post.publishedAt
                ? formatDate(post.publishedAt, locale)
                : t("emptyDate")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`/admin/posts/${post.id}/edit`}
          >
            {t("edit")}
          </Link>
          <PostAdminActions postId={post.id} status={post.status} />
        </div>
      </header>

      <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="space-y-3 text-sm text-[color:var(--foreground)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("contentLabel")}
          </p>
          <p className="whitespace-pre-line text-[color:var(--muted-strong)]">
            {post.content}
          </p>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] hover:text-[color:var(--accent)]"
        href="/admin/posts"
      >
        {t("back")}
      </Link>
    </div>
  );
}
