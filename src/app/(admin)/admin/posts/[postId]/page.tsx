import Link from "next/link";
import { redirect } from "next/navigation";

import { PostAdminActions } from "@/components/posts/post-admin-actions";
import { getPostById } from "@/services/posts";
import { getSession } from "@/server/auth";

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{post.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>Status: {post.status}</span>
            <span>Published: {formatDate(post.publishedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-slate-800 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-200"
            href={`/admin/posts/${post.id}/edit`}
          >
            Edit
          </Link>
          <PostAdminActions postId={post.id} status={post.status} />
        </div>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="space-y-3 text-sm text-slate-200">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Content
          </p>
          <p className="whitespace-pre-line text-slate-300">
            {post.content}
          </p>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-200"
        href="/admin/posts"
      >
        Back to posts
      </Link>
    </div>
  );
}
