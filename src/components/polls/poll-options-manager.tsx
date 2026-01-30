"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";

type PollOption = {
  id: string;
  label: string;
  description?: string | null;
  amount?: string | null;
};

export function PollOptionsManager({
  pollId,
  options,
  canEdit,
}: {
  pollId: string;
  options: PollOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("admin.pollOptions");
  const [addOpen, setAddOpen] = useState(false);
  const [editOption, setEditOption] = useState<PollOption | null>(null);
  const [deleteOption, setDeleteOption] = useState<PollOption | null>(null);
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const selected = editOption ?? deleteOption;
  const selectedLabel = selected?.label ?? "";

  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.label.localeCompare(b.label)),
    [options]
  );

  const addOption = trpc.polls.addOption.useMutation({
    onSuccess: () => {
      setAddOpen(false);
      setLabel("");
      setDescription("");
      setAmount("");
      router.refresh();
    },
  });
  const updateOption = trpc.polls.updateOption.useMutation({
    onSuccess: () => {
      setEditOption(null);
      router.refresh();
    },
  });
  const removeOption = trpc.polls.removeOption.useMutation({
    onSuccess: () => {
      setDeleteOption(null);
      router.refresh();
    },
  });

  const openEdit = (option: PollOption) => {
    setEditOption(option);
    setLabel(option.label);
    setDescription(option.description ?? "");
    setAmount(option.amount ?? "");
  };

  const openAdd = () => {
    setAddOpen(true);
    setLabel("");
    setDescription("");
    setAmount("");
  };

  return (
    <div className="rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <button
          className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={openAdd}
          disabled={!canEdit}
          data-testid="poll-options-add"
        >
          {t("add")}
        </button>
      </div>

      <div className="mt-4 grid gap-3" data-testid="poll-options-list">
        {sortedOptions.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">{t("empty")}</p>
        ) : (
          sortedOptions.map((option) => (
            <div
              key={option.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--foreground)]"
            >
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-[color:var(--muted)]">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    {t("amount", { amount: option.amount })}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-[color:var(--stroke)] px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => openEdit(option)}
                  disabled={!canEdit}
                >
                  {t("edit")}
                </button>
                <button
                  className="rounded-full border border-rose-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => setDeleteOption(option)}
                  disabled={!canEdit}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("addTitle")}
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.label")}
                <input
                  className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.description")}
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.amount")}
                <input
                  className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={addOption.isPending}
                data-testid="poll-options-cancel"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-options-save"
                onClick={() =>
                  addOption.mutate({
                    pollId,
                    label: label.trim(),
                    description: description.trim() || undefined,
                    amount: amount.trim() || undefined,
                  })
                }
                disabled={!label.trim() || addOption.isPending}
              >
                {addOption.isPending ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("editTitle")}
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.label")}
                <input
                  className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.description")}
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                {t("fields.amount")}
                <input
                  className="mt-2 w-full rounded-2xl border border-[color:var(--stroke)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(106,163,143,0.35)] focus:border-[color:var(--accent)] focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setEditOption(null)}
                disabled={updateOption.isPending}
                data-testid="poll-options-cancel"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-options-save"
                onClick={() =>
                  updateOption.mutate({
                    optionId: editOption.id,
                    label: label.trim(),
                    description: description.trim() || undefined,
                    amount: amount.trim() || undefined,
                  })
                }
                disabled={!label.trim() || updateOption.isPending}
              >
                {updateOption.isPending ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.3)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              {t("deleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {t("deleteBody", { label: selectedLabel })}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-[color:var(--stroke)] px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] transition hover:border-[color:var(--accent)]"
                type="button"
                onClick={() => setDeleteOption(null)}
                disabled={removeOption.isPending}
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  removeOption.mutate({ optionId: deleteOption.id })
                }
                disabled={removeOption.isPending}
              >
                {removeOption.isPending ? t("deleting") : t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
