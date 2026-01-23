import Link from "next/link";
import { redirect } from "next/navigation";

import { listCampaignsPaged } from "@/services/fundraising";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function NeighborFundraisingPage({
  params,
  searchParams,
}: {
  params: { groupId: string } | Promise<{ groupId: string }>;
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const query =
    typeof resolvedSearchParams.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";
  const pageRaw =
    typeof resolvedSearchParams.page === "string"
      ? Number(resolvedSearchParams.page)
      : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const offset = (page - 1) * PAGE_SIZE;

  const { items: campaigns, total } = await listCampaignsPaged(
    { user: session.user },
    {
      query: query || undefined,
      status: "open",
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">Community giving</p>
        <h1 className="text-3xl font-semibold">Fundraising</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Active campaigns.
        </p>
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-4 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
          name="q"
          placeholder="Search campaigns"
          defaultValue={query}
        />
        <button
          className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
          type="submit"
        >
          Filter
        </button>
      </form>

      <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        {campaigns.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No active campaigns found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Goal</th>
                  <th className="py-2">Your Group</th>
                  <th className="py-2">Due Date</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[color:var(--foreground)]">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-white/10">
                    <td className="py-3 font-medium">{campaign.title}</td>
                    <td className="py-3 font-medium text-[color:var(--accent)]">
                      ${Number(campaign.goalAmount).toLocaleString()}
                    </td>
                    <td className="py-3 text-[color:var(--muted)]">
                      ${Number(campaign.amount).toLocaleString()}
                    </td>
                    <td className="py-3 text-[color:var(--muted)]">
                      {campaign.dueDate
                        ? new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }).format(new Date(campaign.dueDate))
                        : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
                        href={`/dashboard/${resolvedParams.groupId}/fundraising/${campaign.id}`}
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
              href={`/dashboard/${resolvedParams.groupId}/fundraising${buildQuery({ q: query || undefined, page: String(page - 1) })}`}
            >
              Prev
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/dashboard/${resolvedParams.groupId}/fundraising${buildQuery({ q: query || undefined, page: String(page + 1) })}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
