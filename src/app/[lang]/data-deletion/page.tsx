import { LegalPageShell } from "@/components/legal/legal-page-shell";

const lastUpdated = "March 1, 2026";

export const metadata = {
  title: "Data Deletion Guide | VecinoHub",
  description: "How to request deletion of VecinoHub account data.",
};

export default async function DataDeletionGuidePage({
  params,
}: {
  params: { lang: string } | Promise<{ lang: string }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const { lang } = resolvedParams;

  return (
    <LegalPageShell lang={lang} title="Data Deletion Guide" lastUpdated={lastUpdated}>
      <section className="space-y-3" data-testid="legal-data-deletion-root">
        <h2 className="text-base font-semibold text-stone-900">Delete Your Data From the App</h2>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Sign in to your VecinoHub account.</li>
          <li>Open your profile settings.</li>
          <li>Submit an account deletion request from the account section.</li>
          <li>Confirm the deletion action.</li>
        </ol>
        <p>
          If your organization manages your account, contact your neighborhood administrator to
          coordinate deletion.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">Request Deletion by Email</h2>
        <p>
          You can also request deletion by emailing
          {" "}
          <a className="text-teal-700 underline" href="mailto:privacy@vecinohub.com">
            privacy@vecinohub.com
          </a>
          . Include the email address tied to your account and the subject line
          {" "}
          <strong>&quot;Data Deletion Request&quot;</strong>.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">What We Delete</h2>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Account profile information.</li>
          <li>Authentication credentials and linked session data.</li>
          <li>Personal identifiers associated with your account where deletion is permitted.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">What May Be Retained</h2>
        <p>
          We may retain limited data when required by law, security obligations, dispute
          resolution, or fraud prevention. Retained records are access-restricted and used only
          for those legal and operational purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">Processing Time</h2>
        <p>
          We aim to process verified deletion requests within 30 days. Complex or legally
          constrained requests may take longer, and we will notify you if additional time is
          required.
        </p>
      </section>
    </LegalPageShell>
  );
}
