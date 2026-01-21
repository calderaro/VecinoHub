"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { trpc } from "@/lib/trpc";

type AdminUser = {
  id: string;
  name: string;
  email: string;
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
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Users</h2>
        <form className="flex flex-wrap gap-3" method="get">
          <input
            className="min-w-[200px] rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            name="q"
            placeholder="Search users"
            defaultValue={query}
          />
          <select
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            name="role"
            defaultValue={role}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select
            className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none ring-slate-700 focus:ring-2"
            name="status"
            defaultValue={status}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button
            className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 hover:border-emerald-300 hover:text-emerald-200"
            type="submit"
          >
            Filter
          </button>
        </form>
      </div>
      <div className="mt-4 space-y-3">
        {users.length === 0 ? (
          <p className="text-sm text-slate-500">No users found.</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-800/80 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-slate-200">{user.name}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
                <p className="text-xs text-slate-500">{user.id}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Role
                  <select
                    className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none ring-slate-700 focus:ring-2"
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
                <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Status
                  <select
                    className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 outline-none ring-slate-700 focus:ring-2"
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
          ))
        )}
      </div>
      {error ? (
        <p className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-3">
          {currentPage > 1 ? (
            <a
              className="rounded-full border border-slate-800 px-3 py-1 text-slate-300 hover:border-emerald-300"
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
              className="rounded-full border border-slate-800 px-3 py-1 text-slate-300 hover:border-emerald-300"
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
