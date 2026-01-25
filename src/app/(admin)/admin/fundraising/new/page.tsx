import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CampaignForm } from "@/components/fundraising/campaign-form";
import { getSession } from "@/server/auth";

export default async function NewCampaignPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/fundraising");
  }

  const t = await getTranslations("admin.campaignFormPage");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold">{t("createTitle")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("createSubtitle")}
        </p>
      </header>

      <CampaignForm />
    </div>
  );
}
