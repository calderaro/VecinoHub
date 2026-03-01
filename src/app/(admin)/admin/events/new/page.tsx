import { redirect } from "next/navigation";

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

  return <EventForm mode="create" />;
}
