import { redirect } from "next/navigation";

import { PaymentReportForm } from "@/components/payments/payment-report-form";
import { listUserGroups } from "@/services/groups";
import { getPaymentRequestDetail } from "@/services/payments";
import { getSession } from "@/server/auth";

export default async function AdminPaymentReportPage({
  params,
}: {
  params: { paymentRequestId: string } | Promise<{ paymentRequestId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const serviceContext = { user: session.user };
  const request = await getPaymentRequestDetail(serviceContext, {
    paymentRequestId: resolvedParams.paymentRequestId,
  });

  if (request.status !== "open") {
    redirect(`/admin/payments/${request.id}`);
  }

  const groups = await listUserGroups(serviceContext);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Report payment</h1>
        <p className="text-sm text-slate-400">{request.title}</p>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          <span>Per group: ${request.amount}</span>
          <span>Goal: ${request.goalAmount}</span>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <PaymentReportForm
          paymentRequestId={request.id}
          groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        />
      </section>
    </div>
  );
}
