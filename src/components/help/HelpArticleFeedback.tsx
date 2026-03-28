"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type HelpArticleFeedbackProps = {
  articleSlug: string;
};

export function HelpArticleFeedback({ articleSlug }: HelpArticleFeedbackProps) {
  const locale = useLocale();
  const t = useTranslations("help.feedback");
  const { addToast } = useToast();
  const feedbackQuery = trpc.help.getFeedback.useQuery({ articleSlug });
  const submitFeedback = trpc.help.submitFeedback.useMutation({
    onSuccess: () => {
      addToast(t("saved"), "success");
      void feedbackQuery.refetch();
    },
    onError: (error) => {
      addToast(error.message, "error");
    },
  });

  const [response, setResponse] = useState<"yes" | "no" | null>(null);
  const [comment, setComment] = useState("");
  const [responseTouched, setResponseTouched] = useState(false);
  const [commentTouched, setCommentTouched] = useState(false);
  const savedResponse = feedbackQuery.data?.response ?? null;
  const savedComment = feedbackQuery.data?.comment ?? "";
  const effectiveResponse = responseTouched ? response : savedResponse;
  const effectiveComment = commentTouched ? comment : savedComment;

  const isPending = submitFeedback.isPending;
  const canSubmit = Boolean(effectiveResponse) && !isPending;

  return (
    <section
      className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm"
      data-testid="help-article-feedback"
    >
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-900">{t("title")}</h2>
        <p className="text-sm leading-6 text-stone-600">{t("subtitle")}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["yes", "no"] as const).map((value) => {
          const selected = effectiveResponse === value;

          return (
            <button
              key={value}
              type="button"
              className={`dashboard-v2-focus rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                selected
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
              onClick={() => {
                setResponse(value);
                setResponseTouched(true);
              }}
              data-testid={`help-feedback-${value}`}
            >
              {t(value)}
            </button>
          );
        })}
      </div>

      {effectiveResponse === "no" ? (
        <div className="mt-4 space-y-2">
          <label
            htmlFor="help-feedback-comment"
            className="text-sm font-medium text-stone-700"
          >
            {t("commentLabel")}
          </label>
          <textarea
            id="help-feedback-comment"
            value={effectiveComment}
            onChange={(event) => {
              setComment(event.target.value);
              setCommentTouched(true);
            }}
            placeholder={t("commentPlaceholder")}
            className="dashboard-v2-focus min-h-28 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-800 outline-none placeholder:text-stone-400"
            data-testid="help-feedback-comment"
          />
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-stone-500">
          {feedbackQuery.data?.updatedAt ? t("updated") : t("hint")}
        </p>
        <button
          type="button"
          className="dashboard-v2-focus rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:bg-stone-300"
          disabled={!canSubmit}
          onClick={() =>
            submitFeedback.mutate({
              articleSlug,
              response: effectiveResponse ?? "yes",
              comment: effectiveResponse === "no" ? effectiveComment : null,
              locale: locale === "en" ? "en" : "es",
            })
          }
          data-testid="help-feedback-submit"
        >
          {isPending ? t("saving") : t("submit")}
        </button>
      </div>
    </section>
  );
}
