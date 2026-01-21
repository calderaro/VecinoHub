import Link from "next/link";
import { redirect } from "next/navigation";

import { listPaymentRequestsPaged } from "@/services/payments";
import { getSession } from "@/server/auth";

const PAGE_SIZE = 10;

function buildQuery(params: Record<string, string | undefined>) {
  const entries = Object.entries(params).filter(([, value]) => value);
  const query = new URLSearchParams(entries as [string, string][]);
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function PaymentsPage({
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

  const { items: requests, total } = await listPaymentRequestsPaged(
    { user: session.user },
    {
      query: query || undefined,
      status: status ? (status as "open" | "closed") : undefined,
      limit: PAGE_SIZE,
      offset,
    }
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Payments</h1>
          <p className="text-sm text-slate-400">
            Report payments and track confirmations.
          </p>
        </div>
        {session.user.role === "admin" ? (
          <Link
            className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
            href="/admin/payments/new"
          >
            Add request
          </Link>
        ) : null}
      </header>

      <form className="flex flex-wrap gap-3" method="get">
        <input
          className="min-w-[220px] flex-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
          name="q"
          placeholder="Search requests"
          defaultValue={query}
        />
        <select
          className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
          name="status"
          defaultValue={status}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <button
          className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-200"
          type="submit"
        >
          Filter
        </button>
      </form>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">No payment requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="py-2">Title</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-slate-200">
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-slate-800/80">
                    <td className="py-3 font-medium">{request.title}</td>
                    <td className="py-3 text-slate-400 capitalize">
                      {request.status}
                    </td>
                    <td className="py-3 text-slate-400">${request.amount}</td>
                    <td className="py-3 text-right">
                      <Link
                        className="text-xs uppercase tracking-[0.2em] text-emerald-200 hover:text-emerald-100"
                        href={`/admin/payments/${request.id}`}
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

      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-3">
          {page > 1 ? (
            <Link
              className="rounded-full border border-slate-800 px-3 py-1 text-slate-300 hover:border-emerald-300"
              href={`/admin/payments${buildQuery({ q: query || undefined, status: status || undefined, page: String(page - 1) })}`}
            >
              Prev
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              className="rounded-full border border-slate-800 px-3 py-1 text-slate-300 hover:border-emerald-300"
              href={`/admin/payments${buildQuery({ q: query || undefined, status: status || undefined, page: String(page + 1) })}`}
            >
              Next
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
