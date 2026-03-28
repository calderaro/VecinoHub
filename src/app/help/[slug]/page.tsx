import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { DashboardHeader } from "@/components/dashboard-v2";
import { HelpArticleBody } from "@/components/help/HelpArticleBody";
import {
  getHelpArticleBySlug,
  getHelpScreenLabel,
  listHelpArticles,
} from "@/lib/help-content";
import { listUserGroups } from "@/services/groups";
import {
  hasNeighborhoodAdminRole,
  listNeighborhoodAdminOptions,
} from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function HelpArticlePage({
  params,
}: {
  params: { slug: string } | Promise<{ slug: string }>;
}) {
  const session = await getSession();
  const { slug } = await Promise.resolve(params);

  if (!session) {
    const params = new URLSearchParams({
      tab: "signup",
      next: `/help/${slug}`,
    });
    redirect(`/login?${params.toString()}`);
  }

  const locale = await getLocale();
  const article = getHelpArticleBySlug(locale, slug);
  if (!article) {
    notFound();
  }

  const baseContext = { user: session.user };
  const unscopedContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: null,
    },
  };

  const [groups, canAccessAdmin, adminNeighborhoods, t] = await Promise.all([
    listUserGroups(unscopedContext),
    hasNeighborhoodAdminRole(baseContext),
    listNeighborhoodAdminOptions(baseContext),
    getTranslations("help"),
  ]);

  const relatedArticles = listHelpArticles(locale)
    .filter((candidate) => candidate.slug !== article.slug && candidate.category === article.category)
    .slice(0, 3);

  return (
    <div className="dashboard-v2 dashboard-v2-font min-h-screen bg-stone-50 text-stone-900">
      <DashboardHeader
        user={{
          username: session.user.username,
          image: session.user.image,
          role: session.user.role,
        }}
        groups={groups.map((group) => ({ id: group.id, name: group.name }))}
        neighborhoods={adminNeighborhoods}
        dashboardLabel={t("navLabel")}
        canAccessAdmin={canAccessAdmin}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <div className="space-y-4">
          <Link
            href="/help"
            className="dashboard-v2-focus inline-flex items-center gap-2 text-sm text-stone-500 transition-colors hover:text-stone-700"
            data-testid="help-article-back"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("backToCenter")}
          </Link>

          <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-teal-50 px-2.5 py-1 font-semibold text-teal-700">
                {article.category}
              </span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 font-medium text-stone-600">
                {t(`audiences.${article.audience}`)}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-stone-900">{article.title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-600">{article.summary}</p>

            {locale !== "es" ? (
              <div
                className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                data-testid="help-article-spanish-notice"
              >
                {t("spanishOnlyNotice")}
              </div>
            ) : null}
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm md:p-8">
            <HelpArticleBody article={article} />
          </section>

          <aside className="space-y-5">
            {article.screenHints.length > 0 ? (
              <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  {t("articleScreenHints")}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {article.screenHints.map((hint) => (
                    <span
                      key={hint}
                      className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600"
                    >
                      {getHelpScreenLabel(locale, hint)}
                    </span>
                  ))}
                </div>
              </section>
            ) : null}

            {relatedArticles.length > 0 ? (
              <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-stone-500">
                  {t("relatedArticles")}
                </p>
                <div className="mt-4 space-y-3">
                  {relatedArticles.map((relatedArticle) => (
                    <Link
                      key={relatedArticle.slug}
                      href={`/help/${relatedArticle.slug}`}
                      className="block rounded-2xl border border-stone-200 bg-stone-50/70 p-4 transition-colors hover:border-teal-300 hover:bg-white"
                    >
                      <p className="text-sm font-semibold text-stone-900">{relatedArticle.title}</p>
                      <p className="mt-1 text-xs leading-5 text-stone-500">
                        {relatedArticle.summary}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </aside>
        </div>
      </main>
    </div>
  );
}
