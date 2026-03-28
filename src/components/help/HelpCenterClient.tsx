"use client";

import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import type { HelpArticle, HelpAudience } from "@/lib/help-content";

type HelpCenterClientProps = {
  articles: HelpArticle[];
  preferredAudience: HelpAudience;
  showSpanishOnlyNotice: boolean;
};

function matchesAudience(article: HelpArticle, preferredAudience: HelpAudience) {
  if (article.audience === "shared") {
    return true;
  }

  return article.audience === preferredAudience;
}

export function HelpCenterClient({
  articles,
  preferredAudience,
  showSpanishOnlyNotice,
}: HelpCenterClientProps) {
  const t = useTranslations("help");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredArticles = useMemo(() => {
    if (!normalizedQuery) {
      return articles;
    }

    return articles.filter((article) => {
      const haystack = `${article.title} ${article.summary} ${article.category}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [articles, normalizedQuery]);

  const featuredArticles = useMemo(
    () =>
      articles
        .filter((article) => matchesAudience(article, preferredAudience))
        .slice(0, 4),
    [articles, preferredAudience]
  );

  const categoryLabels = useMemo(
    () => Array.from(new Set(articles.map((article) => article.category))),
    [articles]
  );

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
            data-testid="help-spanish-only-notice"
          >
            {t("spanishOnlyNotice")}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">{t("featuredTitle")}</h2>
              <p className="mt-1 text-sm text-stone-500">{t("featuredSubtitle")}</p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
              {featuredArticles.length}
            </span>
          </div>

          <div className="mt-5 grid gap-3">
            {featuredArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/help/${article.slug}`}
                className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition-colors hover:border-teal-300 hover:bg-white"
                data-testid={`help-featured-${article.slug}`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">
                  {article.category}
                </p>
                <h3 className="mt-2 text-base font-semibold text-stone-900">{article.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{article.summary}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-xl font-semibold text-stone-900">{t("gettingStartedTitle")}</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
            <li>{t("gettingStarted.one")}</li>
            <li>{t("gettingStarted.two")}</li>
            <li>{t("gettingStarted.three")}</li>
          </ul>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">{t("allArticlesTitle")}</h2>
            <p className="mt-1 text-sm text-stone-500">{t("allArticlesSubtitle")}</p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
            {filteredArticles.length}
          </span>
        </div>

        {filteredArticles.length === 0 ? (
          <div
            className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-5 py-8 text-center"
            data-testid="help-center-empty"
          >
            <p className="text-sm font-medium text-stone-700">{t("emptyTitle")}</p>
            <p className="mt-1 text-sm text-stone-500">{t("emptyBody")}</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article) => (
              <Link
                key={article.slug}
                href={`/help/${article.slug}`}
                className="rounded-2xl border border-stone-200 bg-white p-5 transition-colors hover:border-teal-300 hover:shadow-sm"
                data-testid={`help-article-${article.slug}`}
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
