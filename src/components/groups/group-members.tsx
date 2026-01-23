"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";
import { useToast } from "@/components/ui/toast";

type GroupMember = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
};

export function GroupMembers({
  groupId,
  canManage,
  members,
}: {
  groupId: string;
  canManage: boolean;
  members: GroupMember[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<GroupMember | null>(null);
  const canSubmit = email.trim().length > 0;

  const addMember = trpc.groups.addMember.useMutation({
    onSuccess: () => {
      addToast("Member added to the group.", "success");
      setEmail("");
      setAddError(null);
      setAddOpen(false);
      router.refresh();
    },
    onError: (err) => {
      setAddError(err.message);
      addToast(err.message, "error");
    },
  });

  const removeMember = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      addToast("Member removed from the group.", "success");
      setPendingRemove(null);
      router.refresh();
    },
    onError: (err) => addToast(err.message, "error"),
  });

  return (
    <div className="mt-4 space-y-3">
      {canManage ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Members
          </p>
          <button
            className="rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
            type="button"
            onClick={() => {
              setAddError(null);
              setAddOpen(true);
            }}
          >
            Add member
          </button>
        </div>
      ) : null}

      {members.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">No members yet.</p>
      ) : (
        members.map((member) => {
          const displayName = member.username ?? member.name;
          const secondary = member.username ? member.name : member.email;
          return (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[rgba(18,26,26,0.5)] px-3 py-2"
            >
              <div className="flex items-center gap-3">
                {member.image ? (
                  <img
                    className="h-9 w-9 rounded-full border border-white/10 object-cover"
                    src={member.image}
                    alt={displayName}
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[color:var(--surface-strong)] text-xs font-semibold text-[color:var(--muted-strong)]">
                    {(displayName?.[0] ?? "?").toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {displayName}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">{secondary}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/15 px-2 py-1 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)]">
                  {member.role}
                </span>
                {canManage ? (
                  <button
                    className="text-xs uppercase tracking-[0.2em] text-rose-300 hover:text-rose-200"
                    type="button"
                    onClick={() => setPendingRemove(member)}
                    disabled={removeMember.isLoading}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Add group member
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Invite a member by their email address.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                setAddError(null);
                if (!canSubmit) {
                  addToast("Email is required.", "error");
                  return;
                }
                addMember.mutate({ groupId, email });
              }}
            >
              <label className="space-y-2 text-sm text-[color:var(--muted-strong)]">
                <span>Email</span>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-[color:var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setAddError(null);
                  }}
                  placeholder="member@email.com"
                  type="email"
                  required
                />
              </label>
              {addError ? (
                <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {addError}
                </p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                  type="button"
                  onClick={() => {
                    setAddError(null);
                    setAddOpen(false);
                  }}
                  disabled={addMember.isLoading}
                >
                  Cancel
                </button>
                <button
                  className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--accent)] hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={!canSubmit || addMember.isLoading}
                >
                  {addMember.isLoading ? "Adding" : "Add member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {pendingRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[color:var(--surface-strong)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.4)]">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Remove member
            </h3>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Remove {(pendingRemove.username ?? pendingRemove.name)} from this
              group?
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-white/30"
                type="button"
                onClick={() => setPendingRemove(null)}
                disabled={removeMember.isLoading}
              >
                Cancel
              </button>
              <button
                className="rounded-full border border-rose-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-rose-200 hover:border-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                onClick={() =>
                  removeMember.mutate({
                    groupId,
                    userId: pendingRemove.id,
                  })
                }
                disabled={removeMember.isLoading}
              >
                {removeMember.isLoading ? "Removing" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
