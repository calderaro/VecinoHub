"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

export function GroupEditForm({
  groupId,
  initialName,
  initialAddress,
  initialAdminUserId,
}: {
  groupId: string;
  initialName: string;
  initialAddress: string | null;
  initialAdminUserId: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [name, setName] = useState(initialName);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [adminUserId, setAdminUserId] = useState(initialAdminUserId);
  const [isSaving, setIsSaving] = useState(false);
  const isValid = name.trim().length > 0 && adminUserId.trim().length > 0;

  const updateGroup = trpc.groups.update.useMutation();

  const assignAdmin = trpc.groups.assignAdmin.useMutation();

  return (
    <form
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!isValid) {
          addToast("Name and admin user id are required.", "error");
          return;
        }
        setIsSaving(true);
        try {
          await updateGroup.mutateAsync({
            groupId,
            name,
            address: address || undefined,
          });
          if (adminUserId !== initialAdminUserId) {
            await assignAdmin.mutateAsync({ groupId, adminUserId });
          }
          addToast("Group details updated.", "success");
          router.push(`/admin/groups/${groupId}`);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unable to update group.";
          addToast(message, "error");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold">Edit group</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-slate-300">
          <span>Name</span>
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
        <label className="space-y-2 text-sm text-slate-300 sm:col-span-2">
          <span>Admin user id</span>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            value={adminUserId}
            onChange={(event) => setAdminUserId(event.target.value)}
            required
          />
        </label>
      </div>

      <button
        className="mt-4 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
