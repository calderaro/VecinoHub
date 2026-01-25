import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { EventForm } from "@/components/events/event-form";
import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

export default async function AdminEventEditPage({
  params,
}: {
  params: { eventId: string } | Promise<{ eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await Promise.resolve(params);
  const event = await getEventById({ user: session.user }, resolvedParams);
  const t = await getTranslations("admin.eventFormPage");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-12">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.35em] text-[color:var(--muted)]">
          {t("label")}
        </p>
        <h1 className="text-3xl font-semibold">{t("editTitle")}</h1>
        <p className="text-sm text-[color:var(--muted)]">
          {t("editSubtitle")}
        </p>
      </header>
      <EventForm
        mode="edit"
        eventId={event.id}
        initialTitle={event.title}
        initialDescription={event.description}
        initialLocation={event.location}
        initialStartsAt={event.startsAt.toISOString()}
        initialEndsAt={event.endsAt ? event.endsAt.toISOString() : null}
      />
    </div>
  );
}
