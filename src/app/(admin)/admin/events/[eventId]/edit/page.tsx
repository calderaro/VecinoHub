import { redirect } from "next/navigation";

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

  return (
    <EventForm
      mode="edit"
      eventId={event.id}
      initialTitle={event.title}
      initialDescription={event.description}
      initialLocation={event.location}
      initialStartsAt={event.startsAt.toISOString()}
      initialEndsAt={event.endsAt ? event.endsAt.toISOString() : null}
    />
  );
}
