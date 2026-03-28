"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import {
  listFeaturedHelpArticles,
  listStartHereHelpArticles,
  searchHelpArticles,
  type HelpArticle,
  type HelpRole,
} from "@/lib/help-content";
import { trpc } from "@/lib/trpc";

import { HelpTrackedLink } from "./HelpTrackedLink";

type HelpCenterClientProps = {
  articles: HelpArticle[];
  helpRole: HelpRole;
  showSpanishOnlyNotice: boolean;
};

export function HelpCenterClient({
  articles,
  helpRole,
  showSpanishOnlyNotice,
}: HelpCenterClientProps) {
  const t = useTranslations("help");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const recordEvent = trpc.help.recordEvent.useMutation();
  const lastTrackedQuery = useRef("");
  const lastZeroResultQuery = useRef("");

  const recommendedArticles = useMemo(
    () =>
      listFeaturedHelpArticles({
        locale,
        role: helpRole,
        limit: 4,
      }),
    [helpRole, locale]
  );

  const startHereArticles = useMemo(
    () => listStartHereHelpArticles({ locale, role: helpRole }),
    [helpRole, locale]
  );

  const filteredArticles = useMemo(
    () => searchHelpArticles({ locale, query: deferredQuery, role: helpRole }),
    [deferredQuery, helpRole, locale]
  );

  const normalizedQuery = deferredQuery.trim().toLowerCase();

  useEffect(() => {
    if (!normalizedQuery) {
      return;
    }

    const timeout = window.setTimeout(() => {
      if (lastTrackedQuery.current !== normalizedQuery) {
        lastTrackedQuery.current = normalizedQuery;
        recordEvent.mutate({
          eventName: "help_search_used",
          locale: locale === "en" ? "en" : "es",
          source: "help_center",
          query: normalizedQuery,
          resultCount: filteredArticles.length,
        });
      }

      if (filteredArticles.length === 0 && lastZeroResultQuery.current !== normalizedQuery) {
        lastZeroResultQuery.current = normalizedQuery;
        recordEvent.mutate({
          eventName: "help_search_zero_results",
          locale: locale === "en" ? "en" : "es",
          source: "help_center",
          query: normalizedQuery,
          resultCount: 0,
        });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [filteredArticles.length, locale, normalizedQuery, recordEvent]);

  const categoryLabels = useMemo(
    () => Array.from(new Set(articles.map((article) => article.category))),
    [articles]
  );

  const visibleArticles = normalizedQuery ? filteredArticles : articles;

  return (
    <div className="space-y-8" data-testid="help-center-root">
      <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">
              {t("eyebrow")}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-stone-900">{t("title")}</h1>
              <p className="text-sm leading-6 text-stone-600">{t("subtitle")}</p>
            </div>
          </div>

          <label className="flex w-full max-w-md items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-500">
            <SearchIcon className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              data-testid="help-center-search"
            />
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categoryLabels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
            >
              {label}
            </span>
          ))}
        </div>

        {showSpanishOnlyNotice ? (
          <div
            className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
            data-testid="help-center-spanish-notice"
          >
            {t("spanishOnlyNotice")}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">{t("recommendedTitle")}</h2>
            <p className="text-sm text-stone-500">{t("recommendedSubtitle")}</p>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {recommendedArticles.map((article) => (
              <HelpTrackedLink
                key={article.slug}
                href={`/help/${article.slug}`}
                appendHelpSource="recommended"
                className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition-colors hover:border-teal-300 hover:bg-white"
                dataTestId={`help-recommended-${article.slug}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">
                  {article.category}
                </p>
                <h3 className="mt-2 text-base font-semibold text-stone-900">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p>
              </HelpTrackedLink>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-stone-900">{t("startHereTitle")}</h2>
            <p className="text-sm text-stone-500">{t("startHereSubtitle")}</p>
          </div>

          <div className="mt-5 space-y-3">
            {startHereArticles.map((article) => (
              <HelpTrackedLink
                key={article.slug}
                href={`/help/${article.slug}`}
                appendHelpSource="start_here"
                className="block rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-stone-50"
                dataTestId={`help-start-here-${article.slug}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{article.title}</p>
                    <p className="mt-1 text-sm leading-6 text-stone-500">{article.summary}</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                    {article.category}
                  </span>
                </div>
              </HelpTrackedLink>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
            <h3 className="text-sm font-semibold text-stone-900">{t("gettingStartedTitle")}</h3>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-600">
              <li>{t("gettingStarted.one")}</li>
              <li>{t("gettingStarted.two")}</li>
              <li>{t("gettingStarted.three")}</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {normalizedQuery ? t("searchResultsTitle") : t("allArticlesTitle")}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {normalizedQuery ? t("searchResultsSubtitle") : t("allArticlesSubtitle")}
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {visibleArticles.length}
          </span>
        </div>

        {visibleArticles.length === 0 ? (
          <div
            className="mt-6 space-y-5 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8"
            data-testid="help-center-empty"
          >
            <div className="text-center">
              <p className="text-sm font-medium text-stone-700">{t("emptyTitle")}</p>
              <p className="mt-1 text-sm text-stone-500">{t("emptyBody")}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {recommendedArticles.slice(0, 2).map((article) => (
                <HelpTrackedLink
                  key={article.slug}
                  href={`/help/${article.slug}`}
                  appendHelpSource="search_fallback"
                  className="rounded-2xl border border-stone-200 bg-white p-4 transition-colors hover:border-teal-300"
                  dataTestId={`help-fallback-${article.slug}`}
                >
                  <p className="text-sm font-semibold text-stone-900">{article.title}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{article.summary}</p>
                </HelpTrackedLink>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visibleArticles.map((article) => (
              <HelpTrackedLink
                key={article.slug}
                href={`/help/${article.slug}`}
                appendHelpSource={normalizedQuery ? "search" : "library"}
                className="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-teal-300 hover:shadow-sm"
                dataTestId={`help-article-${article.slug}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-600">
                    {article.category}
                  </span>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 font-medium text-teal-700">
                    {t(`audiences.${article.audience}`)}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-stone-900">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p>
              </HelpTrackedLink>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
