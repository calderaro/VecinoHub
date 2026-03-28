import { redirect } from "next/navigation";

import { EventForm } from "@/components/events/event-form";
import { getNeighborhoodById } from "@/services/neighborhoods";
import { getSession } from "@/server/auth";

export default async function NewEventPage({
  params,
}: {
  params: { neighborhoodId: string } | Promise<{ neighborhoodId: string }>;
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
  const neighborhood = await getNeighborhoodById(serviceContext, {
    neighborhoodId: resolvedParams.neighborhoodId,
  }).catch(() => null);
  if (!neighborhood) {
    redirect("/admin");
  }

  return (
    <EventForm
      mode="create"
      adminBasePath={adminBasePath}
      neighborhoodId={resolvedParams.neighborhoodId}
      timeZone={neighborhood.timeZone}
    />
  );
}
