"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type GroupOption = {
  id: string;
  name: string;
};

export function ContributionForm({
  campaignId,
  groups,
  initialGroupId,
  redirectTo,
}: {
  campaignId: string;
  groups: GroupOption[];
  initialGroupId?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.contributionForm");
  const [method, setMethod] = useState<"cash" | "wire_transfer">("cash");
  const [groupId, setGroupId] = useState(
    initialGroupId ?? groups[0]?.id ?? ""
  );
  const [amount, setAmount] = useState("");
  const [wireReference, setWireReference] = useState("");
  const [wireDate, setWireDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountValue = Number(amount);
  const amountFilled = amount.trim().length > 0;
  const amountValid = Number.isFinite(amountValue) && amountValue > 0;
  const wireReady =
    method === "cash" ||
    (wireReference.trim().length > 0 && wireDate.trim().length > 0);

  const submitContribution = trpc.fundraising.submitContribution.useMutation({
    onSuccess: () => {
      setAmount("");
      setWireReference("");
      setWireDate("");
      addToast(t("submittedToast"), "success");
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    },
    onError: (err) => {
      const message = err?.message ?? t("submitError");
      setError(message);
      addToast(message, "error");
    },
  });

  if (groups.length === 0) {
    return (
      <p className="text-sm text-[color:var(--muted)]">
        {t("noGroup")}
      </p>
    );
  }

  return (
    <form
      className="mx-auto mt-4 grid w-full max-w-2xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!amountFilled) {
          setError(t("amountRequired"));
          return;
        }
        if (!amountValid) {
          setError(t("amountInvalid"));
          return;
        }
        if (!wireReady) {
          setError(t("wireRequired"));
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
          {t("fields.group")}
          <select
            className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            value={groupId}
            data-testid="contribution-form-group"
            onChange={(event) => {
              setError(null);
              setGroupId(event.target.value);
            }}
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
          {t("fields.method")}
          <select
            className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
            value={method}
            data-testid="contribution-form-method"
            onChange={(event) => {
              setError(null);
              setMethod(event.target.value as "cash" | "wire_transfer");
            }}
          >
            <option value="cash">{t("methods.cash")}</option>
            <option value="wire_transfer">{t("methods.wire_transfer")}</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        {t("fields.amount")}
        <input
          className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
          data-testid="contribution-form-amount"
          value={amount}
          onChange={(event) => {
            setError(null);
            setAmount(event.target.value);
          }}
          inputMode="decimal"
          required
        />
      </label>

      {method === "wire_transfer" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("fields.reference")}
            <input
              className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
              data-testid="contribution-form-reference"
              value={wireReference}
              onChange={(event) => {
                setError(null);
                setWireReference(event.target.value);
              }}
              required={method === "wire_transfer"}
            />
          </label>
          <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {t("fields.date")}
            <input
              className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
              type="date"
              data-testid="contribution-form-date"
              value={wireDate}
              onChange={(event) => {
                setError(null);
                setWireDate(event.target.value);
              }}
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
        className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#0d1515] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!amountFilled || !wireReady || submitContribution.isPending}
        data-testid="contribution-form-submit"
      >
        {submitContribution.isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
