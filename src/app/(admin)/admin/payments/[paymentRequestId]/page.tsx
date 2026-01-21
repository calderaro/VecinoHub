import Link from "next/link";
import { redirect } from "next/navigation";

import { PaymentReportStatusDialog } from "@/components/payments/payment-report-status-dialog";
import { getPaymentParticipation, getPaymentRequestDetail } from "@/services/payments";
import { getSession } from "@/server/auth";

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: { paymentRequestId: string } | Promise<{ paymentRequestId: string }>;
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const rawStatus = resolvedSearchParams?.status;
  const statusFilter =
    typeof rawStatus === "string" &&
    ["submitted", "confirmed", "rejected"].includes(rawStatus)
      ? (rawStatus as "submitted" | "confirmed" | "rejected")
      : undefined;
  const serviceContext = { user: session.user };
  const request = await getPaymentRequestDetail(serviceContext, {
    paymentRequestId: resolvedParams.paymentRequestId,
  });
  const reportStats = request.reports.reduce(
    (acc, report) => {
      acc.total += 1;
      acc[report.status] += 1;
      return acc;
    },
    { total: 0, submitted: 0, confirmed: 0, rejected: 0 }
  );
  const reportedTotal = request.reports.reduce(
    (sum, report) => sum + Number(report.amount ?? 0),
    0
  );
  const completionPercent =
    Number(request.goalAmount) > 0
      ? Math.round((reportedTotal / Number(request.goalAmount)) * 100)
      : 0;
  const reports = statusFilter
    ? request.reports.filter((report) => report.status === statusFilter)
    : request.reports;
  const participation = await getPaymentParticipation(serviceContext, {
    paymentRequestId: request.id,
  });
  const participationPercent =
    participation.activeGroups > 0
      ? Math.round(
          (participation.reportingGroups / participation.activeGroups) * 100
        )
      : 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{request.title}</h1>
          {request.description ? (
            <p className="text-sm text-slate-400">{request.description}</p>
          ) : null}
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Status: {request.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-200">
            Per group: ${request.amount}
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
            Goal: ${request.goalAmount}
          </span>
          {session.user.role === "admin" ? (
            <Link
              className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
              href={`/admin/payments/${request.id}/edit`}
            >
              Edit
            </Link>
          ) : null}
        </div>
      </header>

      {session.user.role === "admin" ? (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Reported payments</h2>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Groups reported: {participation.reportingGroups}/
              {participation.activeGroups} ({participationPercent}%)
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            <span>Total reported: ${reportedTotal.toFixed(2)}</span>
            <span>Completion: {completionPercent}%</span>
          </div>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            {request.status === "open" ? (
              <Link
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200"
                href={`/admin/payments/${request.id}/report`}
              >
                Report payment
              </Link>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
            <Link
              className={`rounded-full border px-3 py-1 ${
                !statusFilter
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/payments/${request.id}${buildQuery({})}`}
            >
              All ({reportStats.total})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "submitted"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/payments/${request.id}${buildQuery({ status: "submitted" })}`}
            >
              Submitted ({reportStats.submitted})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "confirmed"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/payments/${request.id}${buildQuery({ status: "confirmed" })}`}
            >
              Confirmed ({reportStats.confirmed})
            </Link>
            <Link
              className={`rounded-full border px-3 py-1 ${
                statusFilter === "rejected"
                  ? "border-emerald-300 text-emerald-200"
                  : "border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
              href={`/admin/payments/${request.id}${buildQuery({ status: "rejected" })}`}
            >
              Rejected ({reportStats.rejected})
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {reports.length === 0 ? (
              <p className="text-sm text-slate-500">
                {statusFilter
                  ? "No reports match this status."
                  : "No reports submitted."}
              </p>
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
                  <p className="text-xs text-slate-500">
                    Group:{" "}
                    <Link
                      className="text-emerald-200 hover:text-emerald-100"
                      href={`/admin/groups/${report.groupId}`}
                    >
                      {report.groupName}
                    </Link>
                  </p>
                  <p className="text-xs text-slate-500">
                    Reported by:{" "}
                    {report.submittedByName || report.submittedByEmail}
                  </p>
                </div>
                  <PaymentReportStatusDialog
                    report={{ id: report.id, status: report.status }}
                    canEdit={request.status === "open"}
                  />
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
