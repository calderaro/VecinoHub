import { redirect } from "next/navigation";

import { listAllGroups } from "@/services/groups";
import { listOpenPaymentsWithReportCounts } from "@/services/payments";
import { listOpenPollsWithVoteCounts } from "@/services/polls";
import { listUsers } from "@/services/users";
import { getSession } from "@/server/auth";
import Link from "next/link";

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  const serviceContext = { user: session.user };
  const [users, groups, openPolls, openPayments] = await Promise.all([
    listUsers(serviceContext),
    listAllGroups(serviceContext),
    listOpenPollsWithVoteCounts(serviceContext),
    listOpenPaymentsWithReportCounts(serviceContext),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Admin control room</h1>
        <p className="text-sm text-slate-400">
          High-level overview of users, groups, polls, and payments.
        </p>
      </header>

        <section className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Users", value: users.length },
              { label: "Groups", value: groups.length },
              { label: "Open Polls", value: openPolls.length },
              { label: "Open Payments", value: openPayments.length },
            ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Open polls</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {openPolls.length === 0 ? (
                <li className="text-slate-500">No active polls.</li>
              ) : (
                openPolls.slice(0, 6).map((poll) => (
                  <li
                    key={poll.id}
                    className="rounded-lg border border-slate-800/80 px-3 py-2"
                  >
                    <Link href={`/admin/polls/${poll.id}`}>
                      <p className="font-medium text-slate-200">{poll.title}</p>
                      <p className="text-xs text-slate-500">
                        Votes: {poll.voteCount}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-lg font-semibold">Open payment requests</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {openPayments.length === 0 ? (
                <li className="text-slate-500">No open requests.</li>
              ) : (
                openPayments.slice(0, 6).map((payment) => (
                  <li
                    key={payment.id}
                    className="rounded-lg border border-slate-800/80 px-3 py-2"
                  >
                    <Link href={`/admin/payments/${payment.id}`}>
                      <p className="font-medium text-slate-200">
                        {payment.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        Reports: {payment.reportCount}
                      </p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

      </div>
  );
}
