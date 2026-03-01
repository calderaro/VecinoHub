import { redirect } from "next/navigation";

import { PollForm } from "@/components/polls/poll-form";
import { getSession } from "@/server/auth";

export default async function NewPollPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/admin/polls");
  }

  return <PollForm mode="create" />;
}
