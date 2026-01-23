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
          <p className="text-sm text-[color:var(--muted)]">
            {formatDate(event.startsAt)}
            {event.endsAt ? ` - ${formatDate(event.endsAt)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`/admin/events/${event.id}/edit`}
          >
            Edit
          </Link>
          <EventAdminActions eventId={event.id} />
        </div>
      </header>

      <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
        <div className="grid gap-4 text-sm text-[color:var(--foreground)]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Location
            </p>
            <p className="mt-1">{event.location ?? "TBD"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Description
            </p>
            <p className="mt-1 text-[color:var(--muted-strong)]">
              {event.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <Link
        className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)] hover:text-[color:var(--accent)]"
        href="/admin/events"
      >
        Back to events
      </Link>
    </div>
  );
}
