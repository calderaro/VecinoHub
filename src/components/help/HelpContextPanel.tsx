"use client";

import { useEffect, useState } from "react";
import { BookOpenIcon, ExternalLinkIcon, LifeBuoyIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import type { HelpContextEntry, HelpScreenKey } from "@/lib/help-content";
import { trpc } from "@/lib/trpc";

import { HelpTrackedLink } from "./HelpTrackedLink";

type HelpContextPanelProps = {
  entries: HelpContextEntry[];
  screenKey: HelpScreenKey;
  buttonLabel?: string;
};

export function HelpContextPanel({
  entries,
  screenKey,
  buttonLabel,
}: HelpContextPanelProps) {
  const t = useTranslations("help");
  const locale = useLocale();
  const recordEvent = trpc.help.recordEvent.useMutation();
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
        onClick={() => {
          setOpen(true);
          recordEvent.mutate({
            eventName: "help_context_opened",
            locale: locale === "en" ? "en" : "es",
            screenKey,
            source: "context_button",
          });
        }}
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
                    <span className="sr-only">{t("close")}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-6 py-6">
                {entries.map((entry) => (
                  <section
                    key={entry.id}
                    className="rounded-[28px] border border-stone-200 bg-stone-50/70 p-5"
                    data-testid={`context-help-entry-${entry.id}`}
                  >
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-600">
                        {t("contextPurposeEyebrow")}
                      </p>
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-stone-900">{entry.title}</h3>
                        <p className="text-sm leading-6 text-stone-600">{entry.summary}</p>
                        <p className="text-sm leading-6 text-stone-600">{entry.purpose}</p>
                      </div>
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
                          {t("sections.beforeYouStart")}
                        </p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-stone-600">
                          {entry.beforeYouStart.map((item) => (
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

                    {entry.productLinks.length > 0 ? (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {entry.productLinks.map((link) => (
                          <HelpTrackedLink
                            key={`${entry.id}-${link.href}`}
                            href={link.href}
                            articleSlug={entry.articleSlug}
                            screenKey={screenKey}
                            source={`context_product_${link.intent}`}
                            eventName="help_article_cta_clicked"
                            className="dashboard-v2-focus inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                            dataTestId={`context-help-product-link-${entry.id}-${link.intent}`}
                          >
                            <ExternalLinkIcon className="h-4 w-4" />
                            {link.label}
                          </HelpTrackedLink>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <HelpTrackedLink
                        href={`/help/${entry.articleSlug}`}
                        appendHelpSource="context_panel"
                        articleSlug={entry.articleSlug}
                        screenKey={screenKey}
                        source="context_panel"
                        eventName="help_context_article_clicked"
                        className="dashboard-v2-focus inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
                        dataTestId={`context-help-article-${entry.articleSlug}`}
                        onClick={() => setOpen(false)}
                      >
                        <BookOpenIcon className="h-4 w-4" />
                        {t("fullGuide")}
                      </HelpTrackedLink>
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
