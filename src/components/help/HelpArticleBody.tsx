import Link from "next/link";

import type { HelpArticle } from "@/lib/help-content";

type HelpArticleBodyProps = {
  article: HelpArticle;
};

export function HelpArticleBody({ article }: HelpArticleBodyProps) {
  return (
    <article className="space-y-8">
      {article.body.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold text-stone-900">{section.title}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-stone-600">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="space-y-2 text-sm leading-6 text-stone-600">
              {section.items.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-5">
        <h2 className="text-lg font-semibold text-stone-900">Enlaces útiles</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {article.relatedLinks.map((link) => (
            <Link
              key={`${article.slug}-${link.href}`}
              href={link.href}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </article>
  );
}
