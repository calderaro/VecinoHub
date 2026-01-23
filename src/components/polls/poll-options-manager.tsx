"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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
    <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Options</h2>
        <button
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={openAdd}
          disabled={!canEdit}
        >
          Add option
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {sortedOptions.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No options yet.</p>
        ) : (
          sortedOptions.map((option) => (
            <div
              key={option.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(18,26,26,0.5)] px-3 py-2 text-sm text-[color:var(--foreground)]"
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
                    Amount: ${option.amount}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => openEdit(option)}
                  disabled={!canEdit}
                >
                  Edit
                </button>
                <button
                  className="rounded-full border border-rose-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => setDeleteOption(option)}
                  disabled={!canEdit}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Add poll option
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Label
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Description
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Amount
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={addOption.isPending}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
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
                {addOption.isPending ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Edit option
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Label
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Description
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                Amount
                <input
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setEditOption(null)}
                disabled={updateOption.isPending}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
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
                {updateOption.isPending ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Delete option
            </h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Are you sure you want to delete &quot;{selectedLabel}&quot;?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setDeleteOption(null)}
                disabled={removeOption.isPending}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  removeOption.mutate({ optionId: deleteOption.id })
                }
                disabled={removeOption.isPending}
              >
                {removeOption.isPending ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
