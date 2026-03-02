"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { trpc } from "@/lib/trpc";

export function NeighborhoodCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createNeighborhood = trpc.neighborhoods.create.useMutation({
    onSuccess: () => {
      setName("");
      setSlug("");
      setError(null);
      router.refresh();
    },
    onError: (mutationError) => {
      setError(mutationError.message);
    },
  });

  return (
    <form
      className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        createNeighborhood.mutate({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
        });
      }}
      data-testid="platform-neighborhood-create-form"
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-600">
        Create Neighborhood
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
            data-testid="platform-neighborhood-name"
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
            data-testid="platform-neighborhood-slug"
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-xs text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={createNeighborhood.isPending}
        className="mt-4 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        data-testid="platform-neighborhood-submit"
      >
        {createNeighborhood.isPending ? "Creating..." : "Create neighborhood"}
      </button>
    </form>
  );
}
