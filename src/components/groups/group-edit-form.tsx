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
      className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
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
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Name</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
          <span>Address</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-sm text-[color:var(--muted-strong)] sm:col-span-2">
          <span>Admin user id</span>
          <input
            className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            value={adminUserId}
            onChange={(event) => setAdminUserId(event.target.value)}
            required
          />
        </label>
      </div>

      <button
        className="mt-4 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[#2a1b05] shadow-[0_18px_40px_rgba(225,177,94,0.25)] transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
        type="submit"
        disabled={!isValid || isSaving}
      >
        {isSaving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
