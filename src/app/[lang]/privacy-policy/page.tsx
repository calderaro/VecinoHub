import { LegalPageShell } from "@/components/legal/legal-page-shell";

const lastUpdated = "March 1, 2026";

export const metadata = {
  title: "Privacy Policy | VecinoHub",
  description: "Privacy Policy for VecinoHub.",
};

export default async function PrivacyPolicyPage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const { lang } = resolvedParams;

  return (
    <LegalPageShell lang={lang} title="Privacy Policy" lastUpdated={lastUpdated}>
      <section className="space-y-3" data-testid="legal-privacy-root">
        <h2 className="text-base font-semibold text-stone-900">1. Information We Collect</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account data such as name, email address, and profile settings.</li>
          <li>Community activity data, including posts, votes, and event participation.</li>
          <li>Technical information such as device, browser, and log data.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">2. How We Use Information</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Provide, maintain, and improve VecinoHub.</li>
          <li>Authenticate users and secure accounts.</li>
          <li>Enable neighborhood collaboration features and administration.</li>
          <li>Communicate service updates and support responses.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">3. Legal Bases and Consent</h2>
        <p>
          We process personal data based on contract performance, legitimate interests,
          legal obligations, and consent where required.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">4. Sharing of Information</h2>
        <p>
          We do not sell personal data. We may share data with service providers that support
          hosting, analytics, security, and authentication, subject to contractual safeguards.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">5. Data Retention</h2>
        <p>
          We retain personal data only as long as necessary to provide the service,
          comply with legal requirements, and resolve disputes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">6. Security</h2>
        <p>
          We apply reasonable technical and organizational safeguards to protect personal data.
          No method of transmission or storage is completely secure.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">7. Your Rights</h2>
        <p>Depending on your jurisdiction, you may request access, correction, deletion, or restriction of your data.</p>
        <p>
          To submit a request, contact
          {" "}
          <a className="text-teal-700 underline" href="mailto:privacy@vecinohub.com">
            privacy@vecinohub.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">8. Children&apos;s Privacy</h2>
        <p>
          VecinoHub is not directed to children under 13, and we do not knowingly collect
          personal data from children under 13.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">9. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. Material updates will be posted
          on this page with an updated effective date.
        </p>
      </section>
    </LegalPageShell>
  );
}
