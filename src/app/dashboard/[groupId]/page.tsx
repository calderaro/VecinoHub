import Link from "next/link";
import { redirect } from "next/navigation";

import { listPaymentRequestsPaged } from "@/services/payments";
import { listPollsPaged } from "@/services/polls";
import { getGroupById, listGroupMembers } from "@/services/groups";
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
  const serviceContext = { user: session.user };
  const group = await getGroupById(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const members = await listGroupMembers(serviceContext, {
    groupId: resolvedParams.groupId,
  });
  const polls = await listPollsPaged(serviceContext, {
    limit: 5,
    offset: 0,
  });
  const payments = await listPaymentRequestsPaged(serviceContext, {
    status: "open",
    limit: 5,
    offset: 0,
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{group.name}</h1>
        <p className="text-sm text-slate-400">
          Overview for this house group.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <Link
          href={`/dashboard/${resolvedParams.groupId}/members`}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-300/50 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Members</p>
            <svg
              className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {members.length}
          </p>
          <p className="mt-2 text-sm text-slate-400">People in this group.</p>
        </Link>
        <Link
          href={`/dashboard/${resolvedParams.groupId}/polls`}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-300/50 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Polls</p>
            <svg
              className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {polls.total}
          </p>
          <p className="mt-2 text-sm text-slate-400">Active polls.</p>
        </Link>
        <Link
          href={`/dashboard/${resolvedParams.groupId}/payments`}
          className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-emerald-300/50 hover:bg-slate-900"
        >
          <div className="flex items-start justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payments</p>
            <svg
              className="h-5 w-5 text-slate-600 transition group-hover:translate-x-1 group-hover:text-emerald-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">
            {payments.total}
          </p>
          <p className="mt-2 text-sm text-slate-400">Open requests.</p>
        </Link>
      </section>
    </div>
  );
}
