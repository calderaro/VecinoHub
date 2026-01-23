import Link from "next/link";
import { redirect } from "next/navigation";

import { getEventById } from "@/services/events";
import { getSession } from "@/server/auth";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(value);
}

export default async function NeighborEventDetailPage({
  params,
}: {
  params: { groupId: string; eventId: string } | Promise<{ groupId: string; eventId: string }>;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const event = await getEventById({ user: session.user }, { eventId: resolvedParams.eventId });

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
        {session.user.role === "admin" ? (
          <Link
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            href={`/admin/events/${event.id}`}
          >
            Admin view
          </Link>
        ) : null}
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
        href={`/dashboard/${resolvedParams.groupId}/events`}
      >
        Back to events
      </Link>
    </div>
  );
}
