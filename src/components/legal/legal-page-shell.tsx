import Link from "next/link";

type LegalPageShellProps = {
  lang: string;
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
};

export function LegalPageShell({ lang, title, lastUpdated, children }: LegalPageShellProps) {
  const termsHref = `/${lang}/terms-of-service`;
  const privacyHref = `/${lang}/privacy-policy`;
  const deletionHref = `/${lang}/data-deletion`;

  return (
    <div className="min-h-screen bg-stone-100 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5" data-testid="legal-page-root">
        <header className="rounded-xl border border-stone-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-600">VecinoHub</p>
          <h1 className="mt-1 text-2xl font-bold text-stone-900">{title}</h1>
          <p className="mt-1 text-sm text-stone-500">Last updated: {lastUpdated}</p>
        </header>

        <nav
          className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
          aria-label="Legal links"
          data-testid="legal-nav"
        >
          <Link
            href={termsHref}
            className="vh-v3-focus rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            data-testid="legal-nav-terms"
          >
            Terms of Service
          </Link>
          <Link
            href={privacyHref}
            className="vh-v3-focus rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            data-testid="legal-nav-privacy"
          >
            Privacy Policy
          </Link>
          <Link
            href={deletionHref}
            className="vh-v3-focus rounded-lg px-3 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            data-testid="legal-nav-data-deletion"
          >
            Data Deletion Guide
          </Link>
        </nav>

        <main
          className="space-y-5 rounded-xl border border-stone-200 bg-white px-6 py-6 text-sm leading-6 text-stone-700 shadow-sm"
          data-testid="legal-page-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
