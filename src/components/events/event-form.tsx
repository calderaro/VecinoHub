"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircleIcon,
  AlignLeftIcon,
  CalendarIcon,
  Clock3Icon,
  MapPinIcon,
  SparklesIcon,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";
import { StatusBadge } from "@/components/ui-v3";

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

const inputBase =
  "w-full rounded-lg border px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-teal-400";

function formatPreviewDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
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
  const tPage = useTranslations("admin.eventFormPage");
  const t = useTranslations("admin.eventForm");

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");
  const [startsAt, setStartsAt] = useState(toDateInput(initialStartsAt));
  const [endsAt, setEndsAt] = useState(toDateInput(initialEndsAt ?? undefined));
  const [previewNow] = useState(() => Date.now());
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

  const isDisabled = createEvent.isPending || updateEvent.isPending;

  const previewStatus =
    !parsedStartsAt || parsedStartsAt.getTime() >= previewNow ? "upcoming" : "completed";

  async function handleSubmit() {
    setError(null);

    if (!isValid || !parsedStartsAt) {
      setError(t("validationError"));
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
        addToast(t("createdToast"), "success");
        router.push("/admin/events");
        return;
      }

      if (!eventId) {
        setError("Missing event id.");
        return;
      }

      await updateEvent.mutateAsync({
        eventId,
        title,
        description,
        location,
        startsAt: parsedStartsAt,
        endsAt: parsedEndsAt,
      });
      addToast(t("updatedToast"), "success");
      router.push(`/admin/events/${eventId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("saveError");
      setError(message);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6" data-testid="event-form-root">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-stone-900">
          {mode === "create" ? tPage("createTitle") : tPage("editTitle")}
        </h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {mode === "create" ? tPage("createSubtitle") : tPage("editSubtitle")}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-5 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-5 py-3.5"
        >
          <AlertCircleIcon className="h-4 w-4 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">Failed to save event</p>
            <p className="mt-0.5 text-xs text-red-500">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-6">
        <form
          className="min-w-0 flex-1 space-y-4 pb-24 sm:pb-0"
          onSubmit={async (event) => {
            event.preventDefault();
            await handleSubmit();
          }}
        >
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <SparklesIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Core details
              </h2>
            </div>
            <div className="px-5 py-5">
              <label htmlFor="event-title" className="block text-sm font-medium text-stone-700">
                {t("fields.title")} <span className="text-red-400">*</span>
              </label>
              <input
                id="event-title"
                className={`${inputBase} mt-1.5 border-stone-200 bg-white hover:border-stone-300`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={isDisabled}
                data-testid="event-form-title"
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <CalendarIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Schedule
              </h2>
            </div>
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="event-start" className="block text-sm font-medium text-stone-700">
                  {t("fields.startTime")} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Clock3Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="event-start"
                    className={`${inputBase} border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    type="datetime-local"
                    data-testid="event-form-start"
                    value={startsAt}
                    onChange={(event) => setStartsAt(event.target.value)}
                    disabled={isDisabled}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="event-end" className="block text-sm font-medium text-stone-700">
                  {t("fields.endTime")}
                </label>
                <div className="relative">
                  <Clock3Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    id="event-end"
                    className={`${inputBase} border-stone-200 bg-white pl-10 hover:border-stone-300`}
                    type="datetime-local"
                    data-testid="event-form-end"
                    value={endsAt}
                    onChange={(event) => setEndsAt(event.target.value)}
                    disabled={isDisabled}
                  />
                </div>
              </div>
              <p className="text-xs text-stone-400 sm:col-span-2">
                End time is optional but must be after the start time.
              </p>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <MapPinIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Location
              </h2>
            </div>
            <div className="px-5 py-5">
              <label htmlFor="event-location" className="block text-sm font-medium text-stone-700">
                {t("fields.location")}
              </label>
              <div className="relative mt-1.5">
                <MapPinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  id="event-location"
                  className={`${inputBase} border-stone-200 bg-white pl-10 hover:border-stone-300`}
                  data-testid="event-form-location"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder={t("locationPlaceholder")}
                  disabled={isDisabled}
                />
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-stone-100 px-5 py-3.5">
              <AlignLeftIcon className="h-3.5 w-3.5 text-stone-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Description
              </h2>
            </div>
            <div className="px-5 py-5">
              <label htmlFor="event-description" className="block text-sm font-medium text-stone-700">
                {t("fields.description")}
              </label>
              <textarea
                id="event-description"
                className={`${inputBase} mt-1.5 min-h-[130px] resize-none border-stone-200 bg-white hover:border-stone-300`}
                data-testid="event-form-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isDisabled}
              />
            </div>
          </section>

          <div className="hidden items-center justify-between pt-2 sm:flex">
            <button
              type="button"
              onClick={() => router.push(mode === "create" ? "/admin/events" : `/admin/events/${eventId}`)}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-200"
              disabled={isDisabled}
            >
              Cancel
            </button>
            <button
              className="vh-v3-focus rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              disabled={isDisabled}
              data-testid="event-form-submit"
            >
              {mode === "create"
                ? createEvent.isPending
                  ? t("creating")
                  : t("createAction")
                : updateEvent.isPending
                  ? t("saving")
                  : t("saveChanges")}
            </button>
          </div>
        </form>

        <aside className="sticky top-20 hidden w-72 shrink-0 space-y-4 lg:block">
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">
                Event preview
              </p>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p
                className={`text-sm font-semibold leading-snug ${title.trim() ? "text-stone-900" : "italic text-stone-400"}`}
              >
                {title.trim() || "New Event"}
              </p>
              <div className="space-y-2 border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-stone-400">Status</span>
                  <StatusBadge
                    variant={previewStatus}
                    label={previewStatus === "upcoming" ? "Upcoming" : "Completed"}
                  />
                </div>
                {parsedStartsAt ? (
                  <p className="text-xs leading-relaxed text-stone-500">{formatPreviewDate(parsedStartsAt)}</p>
                ) : null}
                {location.trim() ? (
                  <p className="text-xs leading-relaxed text-stone-500">{location.trim()}</p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-3 border-t border-stone-200 bg-white px-4 py-3 sm:hidden">
        <button
          type="button"
          onClick={() => router.push(mode === "create" ? "/admin/events" : `/admin/events/${eventId}`)}
          className="flex-1 rounded-lg bg-stone-100 py-2.5 text-sm font-medium text-stone-600"
          disabled={isDisabled}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isDisabled}
          data-testid="event-form-submit-mobile"
        >
          {mode === "create"
            ? createEvent.isPending
              ? t("creating")
              : t("createAction")
            : updateEvent.isPending
              ? t("saving")
              : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
