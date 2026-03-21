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
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <button
          className="rounded-lg border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-teal-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className="text-sm text-stone-500">{t("empty")}</p>
        ) : (
          sortedOptions.map((option) => (
            <div
              key={option.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900"
              data-testid={`poll-option-${option.id}`}
            >
              <div className="space-y-1">
                <div className="font-medium">{option.label}</div>
                {option.description ? (
                  <div className="text-xs text-stone-500">
                    {option.description}
                  </div>
                ) : null}
                {option.amount ? (
                  <div className="text-sm text-stone-500">
                    {t("amount", { amount: option.amount })}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg border border-stone-200 px-3 py-1 text-sm text-stone-700 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => openEdit(option)}
                  disabled={!canEdit}
                  data-testid={`poll-options-edit-${option.id}`}
                >
                  {t("edit")}
                </button>
                <button
                  className="rounded-lg border border-rose-300 px-3 py-1 text-sm text-red-700 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                  type="button"
                  onClick={() => setDeleteOption(option)}
                  disabled={!canEdit}
                  data-testid={`poll-options-delete-${option.id}`}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {t("addTitle")}
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.label")}
                <input
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                  data-testid="poll-options-label"
                />
              </label>
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.description")}
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  data-testid="poll-options-description"
                />
              </label>
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.amount")}
                <input
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  data-testid="poll-options-amount"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={addOption.isPending}
                data-testid="poll-options-cancel"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-teal-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {t("editTitle")}
            </h3>
            <div className="mt-4 grid gap-3">
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.label")}
                <input
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  required
                  data-testid="poll-options-label"
                />
              </label>
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.description")}
                <textarea
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  data-testid="poll-options-description"
                />
              </label>
              <label className="space-y-2 text-sm text-stone-500">
                {t("fields.amount")}
                <input
                  className="mt-2 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-teal-200 focus:border-teal-400 focus:ring-2"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  inputMode="decimal"
                  data-testid="poll-options-amount"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                onClick={() => setEditOption(null)}
                disabled={updateOption.isPending}
                data-testid="poll-options-cancel"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-teal-600 transition hover:border-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {t("deleteTitle")}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {t("deleteBody", { label: selectedLabel })}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-700 transition hover:border-teal-300"
                type="button"
                onClick={() => setDeleteOption(null)}
                disabled={removeOption.isPending}
                data-testid="poll-options-delete-cancel"
              >
                {t("cancel")}
              </button>
              <button
                className="rounded-lg border border-rose-300 px-4 py-2 text-sm text-red-700 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                data-testid="poll-options-delete-confirm"
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
