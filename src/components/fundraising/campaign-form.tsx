"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  AlertCircleIcon,
  CalendarIcon,
  DollarSignIcon,
  FileTextIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

type CampaignFormProps = {
  mode: "create" | "edit";
  adminBasePath?: string;
  campaignId?: string;
  initialTitle?: string;
  initialDescription?: string | null;
  initialGoalAmount?: string;
  initialDueDate?: string | null;
  initialStatus?: "open" | "closed";
  initialRaisedAmount?: number;
};

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-400";

function getDisplayLocale(locale: string) {
  return locale === "en" ? "en-US" : "es-MX";
}

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(getDisplayLocale(locale), {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(getDisplayLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }
  const onlyDate = value.split("T")[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(onlyDate) ? onlyDate : "";
}

export function CampaignForm({
  mode,
  adminBasePath = "/admin",
  campaignId,
  initialTitle = "",
  initialDescription = "",
  initialGoalAmount = "",
  initialDueDate = "",
  initialStatus = "open",
  initialRaisedAmount = 0,
}: CampaignFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const { addToast } = useToast();
  const tPage = useTranslations("admin.campaignFormPage");
  const t = useTranslations("admin.campaignForm");
  const tStatus = useTranslations("status");
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [goalAmount, setGoalAmount] = useState(initialGoalAmount);
  const [dueDate, setDueDate] = useState(toDateInput(initialDueDate));
  const [status, setStatus] = useState<"open" | "closed">(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const createCampaign = trpc.fundraising.createCampaign.useMutation();
  const updateCampaign = trpc.fundraising.updateCampaign.useMutation();

  const parsedGoalAmount = useMemo(() => Number(goalAmount), [goalAmount]);
  const isValid = title.trim().length > 0 && Number.isFinite(parsedGoalAmount) && parsedGoalAmount > 0;
  const isDisabled = createCampaign.isPending || updateCampaign.isPending;
  const previewProgress =
    parsedGoalAmount > 0
      ? Math.min(100, Math.round((initialRaisedAmount / parsedGoalAmount) * 100))
      : 0;
  const resolvedStatus = mode === "edit" ? status : "open";
  const statusVariant = resolvedStatus === "open" ? "open" : "ended";
  const cancelHref =
    mode === "create"
      ? `${adminBasePath}/fundraising`
      : `${adminBasePath}/fundraising/${campaignId ?? ""}`;

  async function handleSubmit() {
    setError(null);

    if (!isValid) {
      setError(t("validationError"));
      return;
    }

    const dueDateValue = dueDate ? new Date(`${dueDate}T00:00:00`) : undefined;

    try {
      if (mode === "create") {
        await createCampaign.mutateAsync({
          title: title.trim(),
          description: description.trim() ? description.trim() : undefined,
          goalAmount: String(parsedGoalAmount),
          dueDate: dueDateValue,
        });
        addToast(t("createdToast"), "success");
        router.push(`${adminBasePath}/fundraising`);
        return;
      }

      if (!campaignId) {
        setError(t("saveError"));
        return;
      }

      await updateCampaign.mutateAsync({
        campaignId,
        title: title.trim(),
        description: description.trim() ? description.trim() : undefined,
        goalAmount: String(parsedGoalAmount),
        dueDate: dueDateValue,
        status,
      });
      addToast(t("updatedToast"), "success");
      router.push(`${adminBasePath}/fundraising/${campaignId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveError");
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="campaign-form-root">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">
          {mode === "create" ? tPage("createTitle") : tPage("editTitle")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {mode === "create" ? tPage("createSubtitle") : tPage("editSubtitle")}
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
              <ZapIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Core details
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="campaign-title" className="block text-sm font-medium text-stone-700">
                  {t("fields.title")} <span className="text-red-400">*</span>
                </label>
                <input
                  id="campaign-title"
                  className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Elevator repair campaign"
                  disabled={isDisabled}
                  data-testid="campaign-form-title"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="campaign-description" className="block text-sm font-medium text-stone-700">
                  {t("fields.description")}
                </label>
                <div className="relative">
                  <FileTextIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <textarea
                    id="campaign-description"
                    className={`${inputBase} min-h-[140px] resize-none border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={t("descriptionPlaceholder")}
                    disabled={isDisabled}
                    data-testid="campaign-form-description"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <DollarSignIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Financial goal
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <div className="space-y-1.5">
                <label htmlFor="campaign-goal" className="block text-sm font-medium text-stone-700">
                  {t("fields.goalAmount")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-stone-500">
                    $
                  </span>
                  <input
                    id="campaign-goal"
                    className={`${inputBase} border-stone-200 bg-white pl-8 hover:border-stone-300`}
                    type="number"
                    min="1"
                    step="1"
                    value={goalAmount}
                    onChange={(event) => setGoalAmount(event.target.value)}
                    placeholder={t("goalPlaceholder")}
                    disabled={isDisabled}
                    data-testid="campaign-form-goal"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="campaign-due" className="block text-sm font-medium text-stone-700">
                  {t("fields.dueDate")}
                </label>
                <div className="relative">
                  <CalendarIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="campaign-due"
                    className={`${inputBase} border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    disabled={isDisabled}
                    data-testid="campaign-form-due"
                  />
                </div>
              </div>
            </div>
          </section>

          {mode === "edit" ? (
            <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
                <TrendingUpIcon className="h-3.5 w-3.5 text-stone-400" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                  Campaign status
                </h2>
              </div>
              <div className="space-y-4 px-5 py-5">
                <div className="space-y-1.5">
                  <label htmlFor="campaign-status" className="block text-sm font-medium text-stone-700">
                    {t("fields.status")}
                  </label>
                  <select
                    id="campaign-status"
                    className={`${inputBase} border-stone-200 bg-white hover:border-stone-300`}
                    value={status}
                    onChange={(event) => setStatus(event.target.value as "open" | "closed")}
                    disabled={isDisabled}
                    data-testid="campaign-form-status"
                  >
                    <option value="open">{tStatus("open")}</option>
                    <option value="closed">{tStatus("closed")}</option>
                  </select>
                </div>
              </div>
            </section>
          ) : null}

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
              disabled={isDisabled}
              data-testid="campaign-form-submit"
            >
              {mode === "create"
                ? createCampaign.isPending
                  ? t("creating")
                  : t("createAction")
                : updateCampaign.isPending
                  ? t("saving")
                  : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Campaign preview
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-100 bg-teal-50">
                  <TrendingUpIcon className="h-4 w-4 text-teal-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold leading-snug ${title.trim() ? "text-stone-900" : "italic text-stone-400"}`}
                  >
                    {title.trim() || t("preview.newCampaign")}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-400">{t("preview.fundraisingCampaign")}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("fields.status")}</span>
                  <StatusBadge variant={statusVariant} label={tStatus(resolvedStatus)} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("fields.goalAmount")}</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {parsedGoalAmount > 0 ? formatCurrency(parsedGoalAmount, locale) : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">{t("fields.dueDate")}</span>
                  <span className="text-xs text-stone-600">
                    {dueDate ? formatDate(dueDate, locale) : t("preview.noDueDate")}
                  </span>
                </div>
                {mode === "edit" ? (
                  <>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${previewProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-stone-500">
                      {t("preview.progress", {
                        raised: formatCurrency(initialRaisedAmount, locale),
                        goal:
                          parsedGoalAmount > 0
                            ? formatCurrency(parsedGoalAmount, locale)
                            : formatCurrency(0, locale),
                      })}
                    </p>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-4">
            <p className="text-xs font-semibold text-stone-600">{t("tips.title")}</p>
            <ul className="space-y-1.5 text-xs text-stone-500">
              <li>{t("tips.goal")}</li>
              <li>{t("tips.description")}</li>
              <li>{t("tips.dueDate")}</li>
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
          disabled={isDisabled}
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          data-testid="campaign-form-submit-mobile"
        >
          {mode === "create"
            ? createCampaign.isPending
              ? t("creating")
              : t("createAction")
            : updateCampaign.isPending
              ? t("saving")
              : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
