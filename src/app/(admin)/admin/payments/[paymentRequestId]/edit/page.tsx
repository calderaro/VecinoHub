import { redirect } from "next/navigation";

import { PaymentEditForm } from "@/components/payments/payment-edit-form";
import { getPaymentRequestDetail } from "@/services/payments";
import { getSession } from "@/server/auth";

export default async function PaymentEditPage({
  params,
}: {
  params: { paymentRequestId: string } | Promise<{ paymentRequestId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  if (session.user.role !== "admin") {
    redirect(`/admin/payments/${resolvedParams.paymentRequestId}`);
  }

  const request = await getPaymentRequestDetail({ user: session.user }, {
    paymentRequestId: resolvedParams.paymentRequestId,
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Edit payment request</h1>
        <p className="text-sm text-slate-400">
          Update title, goal amount, and status.
        </p>
      </header>

      <PaymentEditForm
        paymentRequestId={request.id}
        initialTitle={request.title}
        initialDescription={request.description}
        initialGoalAmount={request.goalAmount}
        initialStatus={request.status}
      />
    </div>
  );
}
