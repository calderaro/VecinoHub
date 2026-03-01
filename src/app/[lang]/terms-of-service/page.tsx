import { LegalPageShell } from "@/components/legal/legal-page-shell";

const lastUpdated = "March 1, 2026";

export const metadata = {
  title: "Terms of Service | VecinoHub",
  description: "Terms of Service for VecinoHub.",
};

export default async function TermsOfServicePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const { lang } = resolvedParams;

  return (
    <LegalPageShell lang={lang} title="Terms of Service" lastUpdated={lastUpdated}>
      <section className="space-y-3" data-testid="legal-terms-root">
        <h2 className="text-base font-semibold text-stone-900">1. Acceptance of Terms</h2>
        <p>
          By accessing or using VecinoHub, you agree to these Terms of Service. If you do not
          agree, do not use the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">2. Service Description</h2>
        <p>
          VecinoHub provides tools for neighborhood administration, communication, polls,
          events, fundraising, and member management.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">3. Accounts and Access</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account credentials
          and for activities performed under your account.
        </p>
        <p>
          You must provide accurate information and keep your account details up to date.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">4. Acceptable Use</h2>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Use the service for unlawful, fraudulent, or abusive activity.</li>
          <li>Attempt unauthorized access to systems, data, or other user accounts.</li>
          <li>Upload malicious code or interfere with service operation.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">5. User Content</h2>
        <p>
          You retain ownership of content you submit. By submitting content, you grant
          VecinoHub a limited license to host, process, and display it to provide the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">6. Termination</h2>
        <p>
          We may suspend or terminate access for violations of these terms or for security and
          compliance reasons.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">7. Disclaimer and Liability</h2>
        <p>
          The service is provided &quot;as is&quot; without warranties of any kind to the fullest extent
          permitted by law.
        </p>
        <p>
          VecinoHub is not liable for indirect, incidental, or consequential damages arising
          from your use of the service.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">8. Changes to Terms</h2>
        <p>
          We may update these terms from time to time. Continued use after updates means you
          accept the revised terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">9. Contact</h2>
        <p>
          Questions about these terms can be sent to
          {" "}
          <a className="text-teal-700 underline" href="mailto:legal@vecinohub.com">
            legal@vecinohub.com
          </a>
          .
        </p>
      </section>
    </LegalPageShell>
  );
}
