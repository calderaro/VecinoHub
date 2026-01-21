import { redirect } from "next/navigation";

import { PaymentReportDeleteButton } from "@/components/payments/payment-report-delete-button";
import Link from "next/link";

import { listUserGroups } from "@/services/groups";
import { getPaymentRequestDetail } from "@/services/payments";
import { getSession } from "@/server/auth";

export default async function NeighborPaymentDetailPage({
  params,
}: {
  params: { groupId: string; paymentRequestId: string } | Promise<{ groupId: string; paymentRequestId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const request = await getPaymentRequestDetail(serviceContext, {
    paymentRequestId: resolvedParams.paymentRequestId,
  });
  const reports = request.reports.filter(
    (report) => report.submittedBy === session.user.id
  );
  const reportedTotal = reports.reduce(
    (total, report) => total + Number(report.amount ?? 0),
    0
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">{request.title}</h1>
        {request.description ? (
          <p className="text-sm text-slate-400">{request.description}</p>
        ) : null}
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Status: {request.status}</span>
          <span>Per group: ${request.amount}</span>
          <span>Goal: ${request.goalAmount}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Your reports</h2>
          {request.status === "open" ? (
            <Link
              className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
              href={`/dashboard/${resolvedParams.groupId}/payments/${request.id}/report`}
            >
              Report payment
            </Link>
          ) : null}
        </div>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Total reported: ${reportedTotal.toFixed(2)}
        </p>
        <div className="mt-4 space-y-3">
          {reports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports submitted yet.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800/80 px-3 py-2 text-sm text-slate-300"
              >
                <div>
                  <p className="font-medium text-slate-200">
                    {report.method.replace("_", " ")}
                  </p>
                  <p className="text-xs text-slate-500">
                    Amount: ${report.amount}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {report.status}
                  </p>
                </div>
                {request.status === "open" ? (
                  <PaymentReportDeleteButton reportId={report.id} />
                ) : null}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
