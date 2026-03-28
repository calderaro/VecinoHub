"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { listTimezoneOptions } from "@/lib/timezones/catalog";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type NeighborhoodFormProps = {
  mode: "create" | "edit";
  neighborhoodId?: string;
  initialName?: string;
  initialSlug?: string;
  initialTimeZone?: string;
  initialStatus?: "active" | "inactive";
};

export function NeighborhoodForm({
  mode,
  neighborhoodId,
  initialName = "",
  initialSlug = "",
  initialTimeZone = "America/Mexico_City",
  initialStatus = "active",
}: NeighborhoodFormProps) {
  const timezoneOptions = listTimezoneOptions();
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [timeZone, setTimeZone] = useState(initialTimeZone);
  const [status, setStatus] = useState<"active" | "inactive">(initialStatus);
  const [error, setError] = useState<string | null>(null);

  const createNeighborhood = trpc.neighborhoods.create.useMutation({
    onSuccess: () => {
      setName("");
      setSlug("");
      setTimeZone("America/Mexico_City");
      setStatus("active");
      setError(null);
      addToast("Neighborhood created.", "success");
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const updateNeighborhood = trpc.neighborhoods.update.useMutation({
    onSuccess: (updatedNeighborhood) => {
      setError(null);
      addToast("Neighborhood updated.", "success");
      router.push(`/platform/${updatedNeighborhood.id}`);
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  const isCreateMode = mode === "create";
  const isPending = isCreateMode
    ? createNeighborhood.isPending
    : updateNeighborhood.isPending;
  const formTestId = isCreateMode
    ? "platform-neighborhood-create-form"
    : "platform-neighborhood-edit-form";
  const nameTestId = isCreateMode
    ? "platform-neighborhood-name"
    : "platform-neighborhood-edit-name";
  const slugTestId = isCreateMode
    ? "platform-neighborhood-slug"
    : "platform-neighborhood-edit-slug";
  const timeZoneTestId = isCreateMode
    ? "platform-neighborhood-timezone"
    : "platform-neighborhood-edit-timezone";
  const statusTestId = "platform-neighborhood-edit-status";
  const submitTestId = isCreateMode
    ? "platform-neighborhood-submit"
    : "platform-neighborhood-edit-submit";

  return (
    <form
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);

        if (isCreateMode) {
          createNeighborhood.mutate({
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            timeZone: timeZone.trim(),
          });
          return;
        }

        if (!neighborhoodId) {
          setError("Neighborhood id is required.");
          return;
        }

        updateNeighborhood.mutate({
          neighborhoodId,
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          timeZone: timeZone.trim(),
          status,
        });
      }}
      data-testid={formTestId}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
        {isCreateMode ? "Create Neighborhood" : "Edit Neighborhood"}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Name</span>
          <input
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition-colors focus:border-teal-400"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={1}
            data-testid={nameTestId}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Slug</span>
          <input
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition-colors focus:border-teal-400"
            value={slug}
            onChange={(event) => setSlug(event.target.value)}
            required
            minLength={3}
            pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
            data-testid={slugTestId}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-stone-500">Time zone</span>
          <select
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition-colors focus:border-teal-400"
            value={timeZone}
            onChange={(event) => setTimeZone(event.target.value)}
            required
            data-testid={timeZoneTestId}
          >
            {timezoneOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-stone-400">
            This timezone controls neighborhood scheduling and all neighborhood-local date displays.
          </span>
        </label>
        {!isCreateMode ? (
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-stone-500">Status</span>
            <select
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition-colors focus:border-teal-400"
              value={status}
              onChange={(event) => setStatus(event.target.value as "active" | "inactive")}
              data-testid={statusTestId}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="mt-4 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid={submitTestId}
      >
        {isPending
          ? isCreateMode
            ? "Creating..."
            : "Saving..."
          : isCreateMode
            ? "Create neighborhood"
            : "Save changes"}
      </button>
    </form>
  );
}
