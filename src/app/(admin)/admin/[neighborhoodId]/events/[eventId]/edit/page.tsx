import { redirect } from "next/navigation";

import { EventForm } from "@/components/events/event-form";
import { getEventById } from "@/services/events";
import { getNeighborhoodById } from "@/services/neighborhoods";
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
  const [event, neighborhood] = await Promise.all([
    getEventById(serviceContext, { eventId: resolvedParams.eventId }),
    getNeighborhoodById(serviceContext, { neighborhoodId: resolvedParams.neighborhoodId }).catch(
      () => null
    ),
  ]);
  if (!neighborhood) {
    redirect(adminBasePath);
  }

  return (
    <EventForm
      mode="edit"
      adminBasePath={adminBasePath}
      neighborhoodId={resolvedParams.neighborhoodId}
      timeZone={neighborhood.timeZone}
      eventId={event.id}
      initialTitle={event.title}
      initialDescription={event.description}
      initialLocation={event.location}
      initialStartsAt={event.startsAt.toISOString()}
      initialEndsAt={event.endsAt ? event.endsAt.toISOString() : null}
    />
  );
}
