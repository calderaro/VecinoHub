import { MessageSquareQuoteIcon } from "lucide-react";

import type { HelpQuickAnswer } from "@/lib/help-content";

import { HelpTrackedLink } from "./HelpTrackedLink";

type HelpQuickAnswersProps = {
  answers: HelpQuickAnswer[];
  title: string;
  articleLabel: string;
};

export function HelpQuickAnswers({
  answers,
  title,
  articleLabel,
}: HelpQuickAnswersProps) {
  if (answers.length === 0) {
    return null;
  }

  return (
    <section
      className="grid gap-3 md:grid-cols-2"
      data-testid="help-quick-answers"
    >
      {answers.map((answer) => (
        <article
          key={answer.id}
          className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          data-testid={`help-quick-answer-${answer.id}`}
        >
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-teal-50 p-2 text-teal-700">
              <MessageSquareQuoteIcon className="h-4 w-4" />
            </span>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-600">
                {title}
              </p>
              <h2 className="text-base font-semibold text-stone-900">{answer.question}</h2>
              <p className="text-sm leading-6 text-stone-600">{answer.answer}</p>
              <HelpTrackedLink
                href={`/help/${answer.articleSlug}`}
                appendHelpSource="quick_answer"
                className="inline-flex items-center text-sm font-medium text-teal-700 transition-colors hover:text-teal-600"
                dataTestId={`help-quick-answer-link-${answer.id}`}
              >
                {articleLabel}
              </HelpTrackedLink>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
