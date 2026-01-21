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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Options</h2>
        <button
          className="rounded-full border border-emerald-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          type="button"
          onClick={openAdd}
          disabled={!canEdit}
        >
          Add option
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {sortedOptions.length === 0 ? (
          <p className="text-sm text-slate-400">No options yet.</p>
        ) : (
          sortedOptions.map((option) => (
            <div
              key={option.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-slate-800/80 px-3 py-2 text-sm text-slate-200"
            >
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-slate-400">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    Amount: ${option.amount}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200 hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Add poll option
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Label
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Description
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Amount
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={addOption.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  addOption.mutate({
                    pollId,
                    label: label.trim(),
                    description: description.trim() || undefined,
                    amount: amount.trim() || undefined,
                  })
                }
                disabled={!label.trim() || addOption.isLoading}
              >
                {addOption.isLoading ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Edit option
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Label
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Description
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                Amount
                <input
                  className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setEditOption(null)}
                disabled={updateOption.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-emerald-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  updateOption.mutate({
                    optionId: editOption.id,
                    label: label.trim(),
                    description: description.trim() || undefined,
                    amount: amount.trim() || undefined,
                  })
                }
                disabled={!label.trim() || updateOption.isLoading}
              >
                {updateOption.isLoading ? "Saving" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteOption ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-100">
              Delete option
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete "{selectedLabel}"?
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-slate-500"
                type="button"
                onClick={() => setDeleteOption(null)}
                disabled={removeOption.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  removeOption.mutate({ optionId: deleteOption.id })
                }
                disabled={removeOption.isLoading}
              >
                {removeOption.isLoading ? "Deleting" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
