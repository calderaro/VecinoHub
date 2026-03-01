import Link from "next/link";

import { LegalPageShell } from "@/components/legal/legal-page-shell";

const lastUpdated = "March 1, 2026";

export default async function LocalizedLegalHomePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const { lang } = resolvedParams;

  return (
    <LegalPageShell lang={lang} title="Legal" lastUpdated={lastUpdated}>
      <section className="space-y-3" data-testid="legal-home-root">
        <p>
          This section contains the legal documents required for third-party OAuth providers
          and user transparency.
        </p>
        <ul className="list-disc space-y-1.5 pl-5 text-stone-700">
          <li>
            <Link
              href={`/${lang}/terms-of-service`}
              className="font-medium text-teal-700 hover:text-teal-600"
            >
              Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href={`/${lang}/privacy-policy`}
              className="font-medium text-teal-700 hover:text-teal-600"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href={`/${lang}/data-deletion`}
              className="font-medium text-teal-700 hover:text-teal-600"
            >
              Data Deletion Guide
            </Link>
          </li>
        </ul>
      </section>
    </LegalPageShell>
  );
}
