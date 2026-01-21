import { redirect } from "next/navigation";

import { PaymentRequestForm } from "@/components/payments/payment-request-form";
import { getSession } from "@/server/auth";

export default async function NewPaymentRequestPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/payments");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Create payment request</h1>
        <p className="text-sm text-slate-400">
          Request neighborhood contributions.
        </p>
      </header>

      <PaymentRequestForm />
    </div>
  );
}
