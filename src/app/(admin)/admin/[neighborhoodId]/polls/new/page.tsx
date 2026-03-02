import { redirect } from "next/navigation";

import { PollForm } from "@/components/polls/poll-form";
import { getSession } from "@/server/auth";

export default async function NewPollPage({
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
  return <PollForm mode="create" adminBasePath={adminBasePath} />;
}
