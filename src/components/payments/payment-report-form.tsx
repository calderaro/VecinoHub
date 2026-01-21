"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

type GroupOption = {
  id: string;
  name: string;
};

export function PaymentReportForm({
  paymentRequestId,
  groups,
  initialGroupId,
}: {
  paymentRequestId: string;
  groups: GroupOption[];
  initialGroupId?: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<"cash" | "wire_transfer">("cash");
  const [groupId, setGroupId] = useState(
    initialGroupId ?? groups[0]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [wireReference, setWireReference] = useState("");
  const [wireDate, setWireDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountReady = amount.trim().length > 0;
  const wireReady =
    method === "cash" ||
    (wireReference.trim().length > 0 && wireDate.trim().length > 0);

  const submitReport = trpc.payments.submitReport.useMutation({
    onSuccess: () => {
      setAmount("");
      setWireReference("");
      setWireDate("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  if (groups.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        You are not assigned to a group.
      </p>
    );
  }

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!amountReady) {
          setError("Payment amount is required.");
          return;
        }
        if (!wireReady) {
          setError("Wire transfer details are required.");
          return;
        }
        submitReport.mutate({
          paymentRequestId,
          groupId,
          method,
          amount,
          wireReference: method === "wire_transfer" ? wireReference : undefined,
          wireDate:
            method === "wire_transfer" && wireDate
              ? new Date(wireDate)
              : undefined,
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Group
          <select
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          Method
          <select
            className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={method}
            onChange={(event) => setMethod(event.target.value as "cash" | "wire_transfer")}
          >
            <option value="cash">Cash</option>
            <option value="wire_transfer">Wire transfer</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
        Amount
        <input
          className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          required
        />
      </label>

      {method === "wire_transfer" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Reference
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
              value={wireReference}
              onChange={(event) => setWireReference(event.target.value)}
              required={method === "wire_transfer"}
            />
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            Date
            <input
              className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
              type="date"
              value={wireDate}
              onChange={(event) => setWireDate(event.target.value)}
              required={method === "wire_transfer"}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!amountReady || !wireReady || submitReport.isLoading}
      >
        {submitReport.isLoading ? "Submitting" : "Report payment"}
      </button>
    </form>
  );
}
