import Link from "next/link";
import { redirect } from "next/navigation";

import { EventAdminActions } from "@/components/events/event-admin-actions";
import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

export default async function AdminEventDetailPage({
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">{event.title}</h1>
          <p className="text-sm text-slate-400">
            {formatDate(event.startsAt)}
            {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-slate-800 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-200"
            href={`/admin/events/${event.id}/edit`}
          >
            Edit
          </Link>
          <EventAdminActions eventId={event.id} />
        </div>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="grid gap-4 text-sm text-slate-200">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Location
            </p>
            <p className="mt-1">{event.location ?? "TBD"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Description
            </p>
            <p className="mt-1 text-slate-300">
              {event.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-200"
        href="/admin/events"
      >
        Back to events
      </Link>
    </div>
  );
}
