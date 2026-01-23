"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

type AdminUser = {
  id: string;
  name: string;
  username: string | null;
  email: string;
  image: string | null;
  role: "user" | "admin";
  status: "active" | "inactive";
};

export function UsersTable({
  users,
  currentPage,
  totalPages,
  query,
  role,
  status,
}: {
  users: AdminUser[];
  currentPage: number;
  totalPages: number;
  query: string;
  role: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  const updateStatus = trpc.users.updateStatus.useMutation({
    onSuccess: () => router.refresh(),
    onError: (err) => setError(err.message),
  });

  return (
    <div className="rounded-[28px] border border-white/10 bg-[color:var(--surface)] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <form className="flex flex-wrap gap-3" method="get">
          <input
            className="min-w-[200px] rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            name="q"
            placeholder="Search users"
            defaultValue={query}
          />
          <select
            className="rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            name="role"
            defaultValue={role}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
            name="status"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted-strong)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]"
            type="submit"
          >
            Filter
          </button>
        </form>
      </div>
      <div className="mt-4 space-y-3">
        {users.length === 0 ? (
          <p className="text-sm text-[color:var(--muted)]">No users found.</p>
        ) : (
          users.map((user) => {
            const displayName = user.username ?? user.name;
            return (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[rgba(18,26,26,0.5)] px-3 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  {user.image ? (
                    <img
                      className="h-10 w-10 rounded-full border border-white/10 object-cover"
                      src={user.image}
                      alt={displayName}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[color:var(--surface-strong)] text-xs font-semibold text-[color:var(--muted-strong)]">
                      {(displayName?.[0] ?? "?").toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-[var(--foreground)]">{displayName}</p>
                    {user.username ? (
                      <p className="text-xs text-[color:var(--muted)]">{user.name}</p>
                    ) : null}
                    <p className="text-xs text-[color:var(--muted)]">{user.email}</p>
                    <p className="text-xs text-[color:var(--muted)]">{user.id}</p>
                  </div>
                </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Role
                  <select
                    className="mt-2 rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                    value={user.role}
                    onChange={(event) =>
                      updateRole.mutate({
                        userId: user.id,
                        role: event.target.value as "user" | "admin",
                      })
                    }
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <label className="text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Status
                  <select
                    className="mt-2 rounded-2xl border border-white/10 bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[var(--foreground)] outline-none ring-[rgba(102,185,165,0.35)] focus:border-[color:var(--accent-cool)] focus:ring-2"
                    value={user.status}
                    onChange={(event) =>
                      updateStatus.mutate({
                        userId: user.id,
                        status: event.target.value as "active" | "inactive",
                      })
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                  </select>
                </label>
              </div>
              </div>
            );
          })
        )}
      </div>
      {error ? (
        <p className="mt-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-3">
          {currentPage > 1 ? (
            <a
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin?${new URLSearchParams({
                q: query || "",
                role: role || "",
                status: status || "",
                page: String(currentPage - 1),
              }).toString()}`}
            >
              Prev
            </a>
          ) : null}
          {currentPage < totalPages ? (
            <a
              className="rounded-full border border-white/10 px-3 py-1 text-[color:var(--muted-strong)] hover:border-[color:var(--accent)]"
              href={`/admin?${new URLSearchParams({
                q: query || "",
                role: role || "",
                status: status || "",
                page: String(currentPage + 1),
              }).toString()}`}
            >
              Next
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
