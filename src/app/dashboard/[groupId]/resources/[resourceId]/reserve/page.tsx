import { redirect } from "next/navigation";

import { ResourceReservationForm } from "@/components/resources/resource-reservation-form";
import { getResourceDetailForGroup } from "@/services/resources";
import { getGroupById } from "@/services/groups";
import { getSession } from "@/server/auth";

export default async function ResidentResourceReservePage({
  params,
}: {
  params:
    | { groupId: string; resourceId: string }
    | Promise<{ groupId: string; resourceId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const { groupId, resourceId } = await Promise.resolve(params);
  const baseContext = { user: session.user };
  const group = await getGroupById(baseContext, { groupId }).catch(() => null);
  if (!group) {
    redirect("/dashboard");
  }

  const serviceContext = {
    user: {
      ...session.user,
      activeNeighborhoodId: group.neighborhoodId,
    },
  };

  const resource = await getResourceDetailForGroup(serviceContext, { groupId, resourceId }).catch(
    () => null
  );
  if (!resource) {
    redirect(`/dashboard/${groupId}/resources`);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-6 py-6">
      <ResourceReservationForm
        resourceId={resourceId}
        groupId={groupId}
        resourceName={resource.name}
        groupName={group.name}
        timeZone={resource.timeZone}
        minAdvanceHours={resource.rules.minAdvanceHours}
        maxAdvanceDays={resource.rules.maxAdvanceDays}
      />
    </div>
  );
}
