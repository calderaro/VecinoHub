import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EventForm } from "@/components/events/event-form";
import { getSession } from "@/server/auth";

export default async function NewEventPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const t = await getTranslations("admin.eventFormPage");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold">{t("createTitle")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("createSubtitle")}
        </p>
      </header>
      <EventForm mode="create" />
    </div>
  );
}
