"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

export function GroupCreateForm({ adminUserId }: { adminUserId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isValid = name.trim().length > 0;

  const createGroup = trpc.groups.create.useMutation({
    onSuccess: () => {
      setName("");
      setAddress("");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  return (
    <form
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        if (!isValid) {
          setError("Group name is required.");
          return;
        }
        createGroup.mutate({
          name,
          address: address || undefined,
          adminUserId,
        });
      }}
    >
      <h2 className="text-lg font-semibold">Create group</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Group name</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span>Address</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}
      <button
        className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || createGroup.isLoading}
      >
        {createGroup.isLoading ? "Creating..." : "Create group"}
      </button>
    </form>
  );
}
