"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircleIcon,
  BarChart3Icon,
  CheckSquareIcon,
  FileTextIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { PollOptionsManager } from "@/components/polls/poll-options-manager";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type PollOptionDraft = {
  id: string;
  label: string;
  description: string;
  amount: string;
};

type PollFormProps = {
  mode: "create" | "edit";
  adminBasePath?: string;
  pollId?: string;
  initialTitle?: string;
  initialDescription?: string | null;
  initialStatus?: "draft" | "active" | "closed";
  initialOptions?: Array<{
    id: string;
    label: string;
    description?: string | null;
    amount?: string | null;
  }>;
};

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-400";

function createOptionDraft(overrides?: Partial<PollOptionDraft>): PollOptionDraft {
  return {
    id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    description: "",
    amount: "",
    ...overrides,
  };
}

export function PollForm({
  mode,
  adminBasePath = "/admin",
  pollId,
  initialTitle = "",
  initialDescription = "",
  initialStatus = "draft",
  initialOptions = [],
}: PollFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useTranslations("admin.pollForm");
  const tStatus = useTranslations("status");

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [status, setStatus] = useState<"draft" | "active" | "closed">(initialStatus);
  const [createOptions, setCreateOptions] = useState<PollOptionDraft[]>(
    initialOptions.length > 0
      ? initialOptions.map((option) =>
          createOptionDraft({
            label: option.label,
            description: option.description ?? "",
            amount: option.amount ?? "",
          })
        )
      : [createOptionDraft(), createOptionDraft()]
  );
  const [error, setError] = useState<string | null>(null);

  const createPoll = trpc.polls.create.useMutation();
  const updatePoll = trpc.polls.update.useMutation();

  const validCreateOptions = useMemo(
    () => createOptions.filter((option) => option.label.trim().length > 0),
    [createOptions]
  );

  const isCreateValid = title.trim().length > 0 && validCreateOptions.length >= 2;
  const isEditValid = title.trim().length > 0;
  const isValid = mode === "create" ? isCreateValid : isEditValid;
  const isDisabled = createPoll.isPending || updatePoll.isPending;
  const previewStatus = mode === "create" ? "draft" : status;
  const cancelHref =
    mode === "create" ? `${adminBasePath}/polls` : `${adminBasePath}/polls/${pollId ?? ""}`;

  async function handleSubmit() {
    setError(null);

    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    try {
      if (mode === "create") {
        if (validCreateOptions.length < 2) {
          setError(t("optionsRequired"));
          return;
        }

        await createPoll.mutateAsync({
          title: title.trim(),
          description: description.trim() ? description.trim() : undefined,
          options: validCreateOptions.map((option) => ({
            label: option.label.trim(),
            description: option.description.trim() || undefined,
            amount: option.amount.trim() || undefined,
          })),
        });

        addToast(t("createdToast"), "success");
        router.push(`${adminBasePath}/polls`);
        return;
      }

      if (!pollId) {
        setError(t("saveError"));
        return;
      }

      await updatePoll.mutateAsync({
        pollId,
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        status,
      });

      addToast(t("updatedToast"), "success");
      router.push(`${adminBasePath}/polls/${pollId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveError");
      setError(message);
    }
  }

  function updateCreateOption(
    optionId: string,
    field: keyof Pick<PollOptionDraft, "label" | "description" | "amount">,
    value: string
  ) {
    setCreateOptions((current) =>
      current.map((option) => (option.id === optionId ? { ...option, [field]: value } : option))
    );
  }

  function removeCreateOption(optionId: string) {
    setCreateOptions((current) => current.filter((option) => option.id !== optionId));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="poll-form-root">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">
          {mode === "create" ? t("createTitle") : t("editTitle")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {mode === "create" ? t("createSubtitle") : t("editSubtitle")}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">{t("saveErrorTitle")}</p>
            <p className="mt-0.5 text-xs text-red-500">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-6">
        <form
          className="min-w-0 flex-1 space-y-4 pb-24 sm:pb-0"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSubmit();
          }}
        >
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <SparklesIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Core details
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="poll-title" className="block text-sm font-medium text-stone-700">
                  {t("fields.title")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="poll-title"
                  className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("titlePlaceholder")}
                  disabled={isDisabled}
                  data-testid="poll-form-title"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="poll-description" className="block text-sm font-medium text-stone-700">
                  {t("fields.description")}
                </label>
                <div className="relative">
                  <FileTextIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <textarea
                    id="poll-description"
                    className={`${inputBase} min-h-[130px] resize-none border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    disabled={isDisabled}
                    data-testid="poll-form-description"
                  />
                </div>
              </div>
            </div>
          </section>

          {mode === "create" ? (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <CheckSquareIcon className="h-3.5 w-3.5 text-stone-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                    {t("optionsTitle")}
                  </h2>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2.5 py-1 text-xs font-medium text-teal-600 transition-colors hover:border-teal-300"
                  onClick={() => setCreateOptions((current) => [...current, createOptionDraft()])}
                  disabled={isDisabled}
                  data-testid="poll-form-add-option"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> {t("addOption")}
                </button>
              </div>
              <div className="space-y-3 px-5 py-5">
                {createOptions.map((option, index) => (
                  <div key={option.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {t("optionLabel", { index: index + 1 })}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeCreateOption(option.id)}
                        className="rounded-md p-1 text-stone-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        disabled={createOptions.length <= 2 || isDisabled}
                        data-testid={`poll-form-remove-option-${option.id}`}
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input
                        className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                        placeholder={t("optionFields.label")}
                        value={option.label}
                        onChange={(event) => updateCreateOption(option.id, "label", event.target.value)}
                        disabled={isDisabled}
                        data-testid={`poll-form-option-label-${index + 1}`}
                      />
                      <input
                        className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                        placeholder={t("optionFields.description")}
                        value={option.description}
                        onChange={(event) => updateCreateOption(option.id, "description", event.target.value)}
                        disabled={isDisabled}
                      />
                      <input
                        className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                        placeholder={t("optionFields.amount")}
                        value={option.amount}
                        onChange={(event) => updateCreateOption(option.id, "amount", event.target.value)}
                        disabled={isDisabled}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-stone-400">{t("optionsHint")}</p>
              </div>
            </section>
          ) : (
            <>
              <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
                  <BarChart3Icon className="h-3.5 w-3.5 text-stone-400" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                    {t("fields.status")}
                  </h2>
                </div>
                <div className="space-y-4 px-5 py-5">
                  <select
                    id="poll-status"
                    className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as "draft" | "active" | "closed")
                    }
                    disabled={isDisabled}
                    data-testid="poll-form-status"
                  >
                    <option value="draft">{tStatus("draft")}</option>
                    <option value="active">{tStatus("active")}</option>
                    <option value="closed">{tStatus("closed")}</option>
                  </select>
                </div>
              </section>

              {pollId ? (
                <PollOptionsManager
                  pollId={pollId}
                  options={initialOptions.map((option) => ({
                    id: option.id,
                    label: option.label,
                    description: option.description,
                    amount: option.amount,
                  }))}
                  canEdit={status === "draft"}
                />
              ) : null}
            </>
          )}

          <div className="hidden items-center justify-between pt-2 sm:flex">
            <button
              type="button"
              onClick={() => router.push(cancelHref)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
              disabled={isDisabled}
            >
              {t("cancel")}
            </button>
            <button
              className="vh-v3-focus rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isDisabled || !isValid}
              data-testid="poll-form-submit"
            >
              {mode === "create"
                ? createPoll.isPending
                  ? t("creating")
                  : t("createAction")
                : updatePoll.isPending
                  ? t("saving")
                  : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                {t("preview.title")}
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p
                className={`text-sm font-semibold leading-snug ${title.trim() ? "text-stone-900" : "italic text-stone-400"}`}
              >
                {title.trim() || t("preview.questionFallback")}
              </p>
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("fields.status")}</span>
                  <StatusBadge variant={previewStatus} label={tStatus(previewStatus)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("preview.optionsCount")}</span>
                  <span className="text-xs font-semibold text-stone-700">
                    {mode === "create" ? validCreateOptions.length : initialOptions.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-xs font-semibold text-stone-600">{t("tips.title")}</p>
            <ul className="space-y-1.5 text-xs text-stone-500">
              <li>{t("tips.question")}</li>
              <li>{t("tips.options")}</li>
              <li>{t("tips.status")}</li>
            </ul>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => router.push(cancelHref)}
          disabled={isDisabled}
          className="flex-1 rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-600 disabled:opacity-50"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          disabled={isDisabled || !isValid}
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          data-testid="poll-form-submit-mobile"
        >
          {mode === "create"
            ? createPoll.isPending
              ? t("creating")
              : t("createAction")
            : updatePoll.isPending
              ? t("saving")
              : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
