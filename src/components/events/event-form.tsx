"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type EventFormProps = {
  mode: "create" | "edit";
  eventId?: string;
  initialTitle?: string;
  initialDescription?: string | null;
  initialLocation?: string | null;
  initialStartsAt?: string;
  initialEndsAt?: string | null;
};

function toDateInput(value?: string | null) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 16);
}

export function EventForm({
  mode,
  eventId,
  initialTitle = "",
  initialDescription = "",
  initialLocation = "",
  initialStartsAt,
  initialEndsAt,
}: EventFormProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [startsAt, setStartsAt] = useState(toDateInput(initialStartsAt));
  const [endsAt, setEndsAt] = useState(toDateInput(initialEndsAt ?? undefined));
  const [error, setError] = useState<string | null>(null);

  const createEvent = trpc.events.create.useMutation();
  const updateEvent = trpc.events.update.useMutation();

  const parsedStartsAt = useMemo(() => {
    if (!startsAt) {
      return null;
    }
    const date = new Date(startsAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [startsAt]);

  const parsedEndsAt = useMemo(() => {
    if (!endsAt) {
      return null;
    }
    const date = new Date(endsAt);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [endsAt]);

  const isValid =
    title.trim().length > 0 &&
    parsedStartsAt !== null &&
    (parsedEndsAt === null || parsedEndsAt >= parsedStartsAt);

  return (
    <form
      className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (!isValid || !parsedStartsAt) {
          setError("Title and start time are required.");
          return;
        }
        try {
          if (mode === "create") {
            await createEvent.mutateAsync({
              title,
              description: description || undefined,
              location: location || undefined,
              startsAt: parsedStartsAt,
              endsAt: parsedEndsAt ?? undefined,
            });
          } else {
            await updateEvent.mutateAsync({
              eventId: eventId ?? "",
              title,
              description,
              location,
              startsAt: parsedStartsAt,
              endsAt: parsedEndsAt,
            });
          }
          addToast(
            mode === "create" ? "Event created." : "Event updated.",
            "success"
          );
          if (mode === "create") {
            router.push("/admin/events");
          } else {
            router.refresh();
          }
          if (mode === "create") {
            setTitle("");
            setDescription("");
            setLocation("");
            setStartsAt("");
            setEndsAt("");
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unable to save event.";
          setError(message);
        }
      }}
    >
      <h2 className="text-lg font-semibold">
        {mode === "create" ? "Create event" : "Edit event"}
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)] sm:col-span-2">
          <span>Title</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Start time</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>End time</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)] sm:col-span-2">
          <span>Location</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Community hall"
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)] sm:col-span-2">
          <span>Description</span>
          <textarea
            className="min-h-[96px] w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <button
        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createEvent.isLoading || updateEvent.isLoading}
      >
        {mode === "create"
          ? createEvent.isLoading
            ? "Creating..."
            : "Create event"
          : updateEvent.isLoading
            ? "Saving..."
            : "Save changes"}
      </button>
    </form>
  );
}
