import { redirect } from "next/navigation";

import { EventForm } from "@/components/events/event-form";
import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

export default async function AdminEventEditPage({
  params,
}: {
  params:
    | { neighborhoodId: string; eventId: string }
    | Promise<{ neighborhoodId: string; eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const adminBasePath = `/admin/${resolvedParams.neighborhoodId}`;
  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: resolvedParams.neighborhoodId,
    },
  };
  const event = await getEventById(serviceContext, { eventId: resolvedParams.eventId });

  return (
    <EventForm
      mode="edit"
      adminBasePath={adminBasePath}
      eventId={event.id}
      initialTitle={event.title}
      initialDescription={event.description}
      initialLocation={event.location}
      initialStartsAt={event.startsAt.toISOString()}
      initialEndsAt={event.endsAt ? event.endsAt.toISOString() : null}
    />
  );
}
