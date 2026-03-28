"use client";

import Link from "next/link";
import { BookOpenIcon, LifeBuoyIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import type { HelpContextEntry } from "@/lib/help-content";

type HelpContextPanelProps = {
  entries: HelpContextEntry[];
  buttonLabel?: string;
};

export function HelpContextPanel({
  entries,
  buttonLabel,
}: HelpContextPanelProps) {
  const t = useTranslations("help");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className="dashboard-v2-focus inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
        onClick={() => setOpen(true)}
        data-testid="context-help-open"
      >
        <LifeBuoyIcon className="h-4 w-4" />
        {buttonLabel ?? t("contextButton")}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-stone-950/45 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-context-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div className="flex h-full items-end justify-center p-3 md:items-stretch md:justify-end md:p-0">
            <div className="dashboard-v2-scrollbar flex max-h-[92vh] w-full max-w-2xl flex-col overflow-y-auto rounded-[28px] border border-stone-200 bg-white shadow-2xl md:h-full md:max-h-none md:max-w-xl md:rounded-none md:border-y-0 md:border-r-0">
              <div className="sticky top-0 z-10 border-b border-stone-100 bg-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
                      {t("contextEyebrow")}
                    </p>
                    <div className="space-y-1">
                      <h2 id="help-context-title" className="text-xl font-semibold text-stone-900">
                        {t("contextTitle")}
                      </h2>
                      <p className="text-sm leading-6 text-stone-500">{t("contextSubtitle")}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="dashboard-v2-focus rounded-full border border-stone-200 p-2 text-stone-500 transition-colors hover:bg-stone-50 hover:text-stone-700"
                    onClick={() => setOpen(false)}
                    data-testid="context-help-close"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {locale !== "es" ? (
                  <div
                    className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                    data-testid="context-help-spanish-notice"
                  >
                    {t("spanishOnlyNotice")}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 px-6 py-5">
                {entries.map((entry) => (
                  <section
                    key={entry.id}
                    className="rounded-3xl border border-stone-200 bg-stone-50/70 p-5"
                    data-testid={`context-help-entry-${entry.id}`}
                  >
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-stone-900">{entry.title}</h3>
                      <p className="text-sm leading-6 text-stone-600">{entry.summary}</p>
                    </div>

                    <div className="mt-5 space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                          {t("sections.whoUsesIt")}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-600">
                          {entry.whoUsesIt.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                          {t("sections.keyActions")}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-600">
                          {entry.keyActions.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                          {t("sections.whatHappensNext")}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-600">
                          {entry.whatHappensNext.map((item) => (
                            <li key={item} className="flex gap-3">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/help/${entry.articleSlug}`}
                        className="dashboard-v2-focus inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        onClick={() => setOpen(false)}
                        data-testid={`context-help-article-${entry.articleSlug}`}
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        {t("fullGuide")}
                      </Link>
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
