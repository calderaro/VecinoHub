import Link from "next/link";
import { redirect } from "next/navigation";

import { listPostsPaged } from "@/services/posts";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

function formatDate(value: Date | null) {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
}

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const status =
    typeof resolvedSearchParams.status === "string"
      ? resolvedSearchParams.status
      : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { items: posts, total } = await listPostsPaged(
    { user: session.user },
    {
      query: query || undefined,
      status:
        session.user.role === "admin" && status
          ? (status as "draft" | "published")
          : undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Administration</p>
          <h1 className="text-3xl font-semibold">Posts</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Publish neighborhood updates and announcements.
          </p>
        </div>
        {session.user.role === "admin" ? (
          <Link
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)]"
            href="/admin/posts/new"
          >
            Add post
          </Link>
        ) : null}
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
          name="q"
          placeholder="Search posts"
          defaultValue={query}
        />
        {session.user.role === "admin" ? (
          <select
            className="rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            name="status"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        ) : null}
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="submit"
        >
          Filter
        </button>
      </form>

      <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        {posts.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No posts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Published</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--foreground)]">
                {posts.map((post) => (
                  <tr key={post.id} className="border-t border-white/10">
                    <td className="py-3 font-medium">{post.title}</td>
                    <td className="py-3 text-[color:var(--muted)] capitalize">
                      {post.status}
                    </td>
                    <td className="py-3 text-[color:var(--muted)]">
                      {formatDate(post.publishedAt)}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        href={`/admin/posts/${post.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin/posts${buildQuery({
                q: query || undefined,
                status: status || undefined,
                page: String(page - 1),
              })}`}
            >
              Prev
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin/posts${buildQuery({
                q: query || undefined,
                status: status || undefined,
                page: String(page + 1),
              })}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
