"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

type GroupOption = {
  id: string;
  name: string;
};

export function ContributionForm({
  campaignId,
  groups,
  initialGroupId,
}: {
  campaignId: string;
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

  const submitContribution = trpc.fundraising.submitContribution.useMutation({
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
      <p className="text-sm text-[color:var(--muted)]">
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
          setError("Contribution amount is required.");
          return;
        }
        if (!wireReady) {
          setError("Wire transfer details are required.");
          return;
        }
        submitContribution.mutate({
          campaignId,
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
        <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Group
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
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
        <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Method
          <select
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={method}
            onChange={(event) => setMethod(event.target.value as "cash" | "wire_transfer")}
          >
            <option value="cash">Cash</option>
            <option value="wire_transfer">Wire transfer</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        Amount
        <input
          className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          required
        />
      </label>

      {method === "wire_transfer" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Reference
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
              value={wireReference}
              onChange={(event) => setWireReference(event.target.value)}
              required={method === "wire_transfer"}
            />
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Date
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
              type="date"
              value={wireDate}
              onChange={(event) => setWireDate(event.target.value)}
              required={method === "wire_transfer"}
            />
          </label>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!amountReady || !wireReady || submitContribution.isPending}
      >
        {submitContribution.isPending ? "Submitting" : "Submit contribution"}
      </button>
    </form>
  );
}
